// ============================================================
//  COUCHE DE DONNÉES
//  Deux moteurs avec exactement les mêmes fonctions :
//   - DemoStore     : données fictives dans le navigateur
//   - SupabaseStore : vraie base + connexion Discord
// ============================================================
(function () {
  const CFG = window.REY_CONFIG || {};
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------------------------------------------------------- DÉMO
  function DemoStore() {
    const CLE = "reyancerie-demo-v3";
    let db;
    try { db = JSON.parse(localStorage.getItem(CLE) || "null"); } catch (e) { db = null; }
    if (!db) db = JSON.parse(JSON.stringify(window.REY_DEMO));
    if (!("session" in db)) db.session = null;
    const save = () => { try { localStorage.setItem(CLE, JSON.stringify(db)); } catch (e) {} };
    const moi = () => db.session;
    const equipe = () => { const p = db.profils.find((x) => x.id === moi()); return !!p && p.role !== "membre"; };
    const visible = (o) => o.statut === "approuve" || o.author_id === moi() || equipe();
    const lireFichier = (f) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
    const signalementsDe = (type, id) => db.signalements.filter((r) => r.target_type === type && r.target_id === id);

    return {
      mode: "demo",
      async init() {},
      async me() { return moi() ? db.profils.find((p) => p.id === moi()) || null : null; },
      async signIn() { db.session = "u1"; save(); location.hash = "#/moi"; location.reload(); },
      // Démo uniquement : passer d'admin (Rey) à simple membre (Kaito) pour voir la différence
      async changerRoleDemo() { db.session = db.session === "u1" ? "u3" : "u1"; save(); location.reload(); },
      async signOut() { db.session = null; save(); location.hash = "#/"; location.reload(); },
      async reset() { try { localStorage.removeItem(CLE); } catch (e) {} location.reload(); },

      async profiles() { return db.profils.slice(); },
      async profile(id) { return db.profils.find((p) => p.id === id) || null; },
      async updateProfile(patch) {
        const p = db.profils.find((x) => x.id === moi());
        Object.assign(p, patch); save(); return p;
      },

      async builds(f = {}) {
        return db.builds
          .filter((b) => visible(b) && (!f.game || b.game === f.game) && (!f.author || b.author_id === f.author) && (!f.character || b.character === f.character))
          .map((b) => ({ ...b, like_count: b.likes.length, liked: b.likes.includes(moi()) }))
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async build(id) { return (await this.builds()).find((b) => b.id === id) || null; },
      async createBuild(b, fichiers) {
        const images = await Promise.all((fichiers || []).map(lireFichier));
        const n = { id: uid(), author_id: moi(), created_at: new Date().toISOString(), likes: [], ...b, images, statut: equipe() ? "approuve" : "en_attente" };
        db.builds.push(n); save(); return n;
      },
      async deleteBuild(id) { db.builds = db.builds.filter((b) => b.id !== id); save(); },

      async memories(f = {}) {
        return db.souvenirs
          .map((m) => ({ kind: "souvenir", character: "", ...m }))
          .filter((m) => visible(m) && (!f.game || m.game === f.game) && (!f.author || m.author_id === f.author) && (!f.event || m.event_id === f.event) && (!f.character || m.character === f.character))
          .map((m) => ({ ...m, like_count: m.likes.length, liked: m.likes.includes(moi()) }))
          .sort((a, b) => b.happened_on.localeCompare(a.happened_on));
      },
      async createMemory(m, fichier) {
        let image_url = "";
        if (fichier) image_url = await lireFichier(fichier);
        const n = { id: uid(), author_id: moi(), created_at: new Date().toISOString(), likes: [], ...m, image_url, statut: equipe() || !image_url ? "approuve" : "en_attente" };
        db.souvenirs.push(n); save(); return n;
      },
      async deleteMemory(id) { db.souvenirs = db.souvenirs.filter((m) => m.id !== id); save(); },

      async events(f = {}) {
        return db.evenements
          .filter((e) => (!f.game || e.game === f.game))
          .map((e) => ({ ...e, participant_count: e.participants.length, joined: e.participants.includes(moi()) }))
          .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
      },
      async event(id) { return (await this.events()).find((e) => e.id === id) || null; },
      async participants(eventId) {
        const e = db.evenements.find((x) => x.id === eventId);
        return e ? db.profils.filter((p) => e.participants.includes(p.id)) : [];
      },
      async createEvent(e) {
        const n = { id: uid(), created_by: moi(), participants: [], ...e };
        db.evenements.push(n); save(); return n;
      },
      async updateEvent(id, patch) { Object.assign(db.evenements.find((e) => e.id === id), patch); save(); },
      async toggleJoin(id) {
        const e = db.evenements.find((x) => x.id === id);
        const i = e.participants.indexOf(moi());
        i >= 0 ? e.participants.splice(i, 1) : e.participants.push(moi());
        save();
      },
      async toggleLike(type, id) {
        const liste = type === "build" ? db.builds : db.souvenirs;
        const o = liste.find((x) => x.id === id);
        const i = o.likes.indexOf(moi());
        i >= 0 ? o.likes.splice(i, 1) : o.likes.push(moi());
        save();
      },
      async participationCount(userId) {
        return db.evenements.filter((e) => e.participants.includes(userId)).length;
      },

      // ---------- modération
      async report(type, id, reason) {
        if (signalementsDe(type, id).some((r) => r.user_id === moi())) throw new Error("tu as déjà signalé cette publication");
        db.signalements.push({ target_type: type, target_id: id, user_id: moi(), reason, created_at: new Date().toISOString() });
        if (signalementsDe(type, id).length >= 3) {
          const o = (type === "build" ? db.builds : db.souvenirs).find((x) => x.id === id);
          if (o) o.statut = "en_attente";
        }
        save();
      },
      async moderation() {
        const avecSignal = (type) => (o) => ({ ...o, type, signalements: signalementsDe(type, o.id) });
        const signales = new Set(db.signalements.map((r) => r.target_type + ":" + r.target_id));
        const garde = (type) => (o) => o.statut === "en_attente" || signales.has(type + ":" + o.id);
        return [
          ...db.builds.filter(garde("build")).map(avecSignal("build")),
          ...db.souvenirs.filter(garde("memory")).map(avecSignal("memory"))
        ].sort((a, b) => b.signalements.length - a.signalements.length || b.created_at.localeCompare(a.created_at));
      },
      async approve(type, id) {
        const o = (type === "build" ? db.builds : db.souvenirs).find((x) => x.id === id);
        if (o) o.statut = "approuve";
        db.signalements = db.signalements.filter((r) => !(r.target_type === type && r.target_id === id));
        save();
      },
      async reject(type, id) {
        db.signalements = db.signalements.filter((r) => !(r.target_type === type && r.target_id === id));
        return type === "build" ? this.deleteBuild(id) : this.deleteMemory(id);
      }
    };
  }

  // ------------------------------------------------------ SUPABASE
  function SupabaseStore() {
    const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    let session = null;
    let monProfil = null;
    const oops = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };
    const mid = () => session && session.user.id;
    const BUCKET = "souvenirs";
    async function envoyerImage(fichier) {
      const ext = (fichier.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const chemin = mid() + "/" + crypto.randomUUID() + "." + ext;
      oops(await sb.storage.from(BUCKET).upload(chemin, fichier, { contentType: fichier.type }));
      return sb.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
    }
    async function supprimerImages(urls) {
      const marque = "/object/public/" + BUCKET + "/";
      const chemins = (urls || []).filter(Boolean).map((u) => u.split(marque)[1]).filter(Boolean).map(decodeURIComponent);
      if (chemins.length) await sb.storage.from(BUCKET).remove(chemins); // un échec ici ne bloque pas la suppression
    }

    async function likesPour(type, ids) {
      if (!ids.length) return {};
      const rows = oops(await sb.from("likes").select("target_id,user_id").eq("target_type", type).in("target_id", ids));
      const m = {};
      rows.forEach((r) => { (m[r.target_id] = m[r.target_id] || []).push(r.user_id); });
      return m;
    }
    const avecLikes = async (type, rows) => {
      const m = await likesPour(type, rows.map((r) => r.id));
      return rows.map((r) => ({ ...r, like_count: (m[r.id] || []).length, liked: (m[r.id] || []).includes(mid()) }));
    };

    // Vérifie que le membre est bien sur le serveur Discord.
    async function verifierServeur() {
      if (!CFG.DISCORD_GUILD_ID || !session || !session.provider_token) return;
      try {
        const r = await fetch("https://discord.com/api/users/@me/guilds", { headers: { Authorization: "Bearer " + session.provider_token } });
        if (!r.ok) return;
        const guilds = await r.json();
        const dedans = guilds.some((g) => g.id === CFG.DISCORD_GUILD_ID);
        await sb.rpc("set_membre_serveur", { valeur: dedans });
        if (monProfil) monProfil.is_member = dedans;
      } catch (e) { /* on réessaiera à la prochaine connexion */ }
    }

    return {
      mode: "supabase",
      async init() {
        session = oops(await sb.auth.getSession()).session;
        if (session) {
          monProfil = oops(await sb.from("profiles").select("*").eq("id", mid()).maybeSingle());
          await verifierServeur();
        }
        sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") location.reload(); });
      },
      async me() { return monProfil; },
      async signIn() {
        await sb.auth.signInWithOAuth({
          provider: "discord",
          options: { scopes: "identify guilds", redirectTo: location.origin + location.pathname }
        });
      },
      async signOut() { await sb.auth.signOut(); location.hash = "#/"; },

      async profiles() { return oops(await sb.from("profiles").select("*").order("created_at")); },
      async profile(id) { return oops(await sb.from("profiles").select("*").eq("id", id).maybeSingle()); },
      async updateProfile(patch) {
        monProfil = oops(await sb.from("profiles").update(patch).eq("id", mid()).select().single());
        return monProfil;
      },

      async builds(f = {}) {
        let q = sb.from("builds").select("*").order("created_at", { ascending: false });
        if (f.game) q = q.eq("game", f.game);
        if (f.author) q = q.eq("author_id", f.author);
        if (f.character) q = q.eq("character", f.character);
        return avecLikes("build", oops(await q));
      },
      async build(id) {
        const r = oops(await sb.from("builds").select("*").eq("id", id).maybeSingle());
        return r ? (await avecLikes("build", [r]))[0] : null;
      },
      async createBuild(b, fichiers) {
        const images = [];
        for (const f of fichiers || []) images.push(await envoyerImage(f));
        return oops(await sb.from("builds").insert({ ...b, images, author_id: mid() }).select().single());
      },
      async deleteBuild(id) {
        const r = oops(await sb.from("builds").select("images").eq("id", id).maybeSingle());
        oops(await sb.from("builds").delete().eq("id", id));
        await supprimerImages(r && r.images);
      },

      async memories(f = {}) {
        let q = sb.from("memories").select("*").order("happened_on", { ascending: false });
        if (f.game) q = q.eq("game", f.game);
        if (f.author) q = q.eq("author_id", f.author);
        if (f.event) q = q.eq("event_id", f.event);
        if (f.character) q = q.eq("character", f.character);
        return avecLikes("memory", oops(await q));
      },
      async createMemory(m, fichier) {
        const image_url = fichier ? await envoyerImage(fichier) : "";
        return oops(await sb.from("memories").insert({ ...m, image_url, author_id: mid() }).select().single());
      },
      async deleteMemory(id) {
        const r = oops(await sb.from("memories").select("image_url").eq("id", id).maybeSingle());
        oops(await sb.from("memories").delete().eq("id", id));
        await supprimerImages([r && r.image_url]);
      },

      async events(f = {}) {
        let q = sb.from("events").select("*, event_participants(user_id)").order("starts_at", { ascending: false });
        if (f.game) q = q.eq("game", f.game);
        return oops(await q).map((e) => {
          const ids = (e.event_participants || []).map((p) => p.user_id);
          return { ...e, participant_count: ids.length, joined: ids.includes(mid()) };
        });
      },
      async event(id) { return (await this.events()).find((e) => e.id === id) || null; },
      async participants(eventId) {
        const rows = oops(await sb.from("event_participants").select("profiles(*)").eq("event_id", eventId));
        return rows.map((r) => r.profiles).filter(Boolean);
      },
      async createEvent(e) { return oops(await sb.from("events").insert({ ...e, created_by: mid() }).select().single()); },
      async updateEvent(id, patch) { oops(await sb.from("events").update(patch).eq("id", id)); },
      async toggleJoin(id) {
        const deja = oops(await sb.from("event_participants").select("event_id").eq("event_id", id).eq("user_id", mid()));
        if (deja.length) oops(await sb.from("event_participants").delete().eq("event_id", id).eq("user_id", mid()));
        else oops(await sb.from("event_participants").insert({ event_id: id, user_id: mid() }));
      },
      async toggleLike(type, id) {
        const t = type === "build" ? "build" : "memory";
        const deja = oops(await sb.from("likes").select("target_id").eq("target_type", t).eq("target_id", id).eq("user_id", mid()));
        if (deja.length) oops(await sb.from("likes").delete().eq("target_type", t).eq("target_id", id).eq("user_id", mid()));
        else oops(await sb.from("likes").insert({ target_type: t, target_id: id, user_id: mid() }));
      },
      async participationCount(userId) {
        const r = await sb.from("event_participants").select("event_id", { count: "exact", head: true }).eq("user_id", userId);
        return r.count || 0;
      },

      // ---------- modération
      async report(type, id, reason) {
        const r = await sb.from("reports").insert({ target_type: type, target_id: id, user_id: mid(), reason });
        if (r.error && r.error.code === "23505") throw new Error("tu as déjà signalé cette publication");
        oops(r);
      },
      async moderation() {
        const sig = oops(await sb.from("reports").select("*"));
        const idsSig = (t) => [...new Set(sig.filter((r) => r.target_type === t).map((r) => r.target_id))];
        const charger = async (table, type) => {
          const ids = idsSig(type);
          let q = sb.from(table).select("*");
          q = ids.length ? q.or(`statut.eq.en_attente,id.in.(${ids.join(",")})`) : q.eq("statut", "en_attente");
          return oops(await q).map((o) => ({ ...o, type, signalements: sig.filter((r) => r.target_type === type && r.target_id === o.id) }));
        };
        const tout = [...(await charger("builds", "build")), ...(await charger("memories", "memory"))];
        return tout.sort((a, b) => b.signalements.length - a.signalements.length || b.created_at.localeCompare(a.created_at));
      },
      async approve(type, id) {
        oops(await sb.from(type === "build" ? "builds" : "memories").update({ statut: "approuve" }).eq("id", id));
        oops(await sb.from("reports").delete().eq("target_type", type).eq("target_id", id));
      },
      async reject(type, id) {
        oops(await sb.from("reports").delete().eq("target_type", type).eq("target_id", id));
        return type === "build" ? this.deleteBuild(id) : this.deleteMemory(id);
      }
    };
  }

  window.REY_STORE = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase ? SupabaseStore() : DemoStore();
})();
