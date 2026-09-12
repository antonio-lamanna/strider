const translations={
  en:{
    archTitle:"Architecture",archMini:"Map applications, integrations, infrastructure and trust boundaries.",
    dataTitle:"Data models",dataMini:"Shape relational structures, keys and cardinalities visually.",
    flowTitle:"Workflows",flowMini:"Design human, automated and AI-assisted process flows.",
    kicker:"Three views. One design language.",secTitle:"From system context to execution logic.",
    secLead:"Strider keeps different architecture conversations in the same visual grammar: consistent nodes, connections, inspectors and portable project files.",
    f1title:"See the system, not just the boxes.",f1body:"Compose application landscapes with cloud services, business applications, databases, security zones and integration paths. Product-aware icons and labelled flows keep the design immediately readable.",
    f2title:"Model data without losing the relationships.",f2body:"Build relational models as diagrams first: tables, fields, primary and foreign keys, data types and 1:N relationships stay visible in context.",
    f3title:"Design work across humans, automation and AI.",f3body:"Lay out process logic with tasks, gateways, events and AI agents. Switch orientation when the conversation needs it, without changing the underlying workflow.",
    whyTitle:"Deliberately lightweight.",whyBody:"No account setup, no database to maintain, no heavy project ceremony. Start a diagram, save the XML, reopen it later and keep moving.",
    priceLabel:"PRICING",priceCopy:"One less page to negotiate with.",priceForever:"no subscription",
    credits:"Visual system design workspace. Uses React Flow and product iconography from Simple Icons where applicable. Product names and marks belong to their respective owners.",
    asterisk:"Free to use, with no planned expiration.",created:"Prompted & created by"
  },
  it:{
    archTitle:"Architettura",archMini:"Mappa applicazioni, integrazioni, infrastruttura e trust boundary.",
    dataTitle:"Data model",dataMini:"Disegna strutture relazionali, chiavi e cardinalità in modo visuale.",
    flowTitle:"Workflow",flowMini:"Progetta flussi umani, automatizzati e assistiti dall'AI.",
    kicker:"Tre viste. Un solo linguaggio visuale.",secTitle:"Dal contesto di sistema alla logica di esecuzione.",
    secLead:"Strider mantiene conversazioni architetturali diverse nello stesso linguaggio visuale: nodi, connessioni, inspector e file di progetto portabili.",
    f1title:"Vedi il sistema, non solo i box.",f1body:"Componi landscape applicativi con servizi cloud, applicazioni, database, zone di sicurezza e percorsi di integrazione. Icone di prodotto e flussi etichettati rendono il design immediatamente leggibile.",
    f2title:"Modella i dati senza perdere le relazioni.",f2body:"Costruisci prima il modello come diagramma: tabelle, campi, primary e foreign key, tipi dati e relazioni 1:N restano visibili nel loro contesto.",
    f3title:"Progetta il lavoro tra persone, automazione e AI.",f3body:"Disegna la logica di processo con task, gateway, eventi e agenti AI. Cambia orientamento quando serve alla conversazione, senza alterare il workflow sottostante.",
    whyTitle:"Volutamente leggero.",whyBody:"Nessun account da configurare, nessun database da mantenere, nessuna cerimonia di progetto. Parti dal diagramma, salvi l'XML, lo riapri e continui.",
    priceLabel:"PRICING",priceCopy:"Una pagina in meno da negoziare.",priceForever:"nessun abbonamento",
    credits:"Workspace visuale per il system design. Utilizza React Flow e, dove applicabile, iconografia di prodotto da Simple Icons. Nomi e marchi appartengono ai rispettivi proprietari.",
    asterisk:"Gratuito, senza una data di scadenza prevista.",created:"Prompted & created by"
  }
};
const root=document.documentElement;
const themeBtn=document.getElementById('themeToggle');
const themeIcon=document.getElementById('themeIcon');
const moon=`<svg viewBox="0 0 24 24"><path d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5 8.5 8.5 0 1 0 20.5 14.7Z"/></svg>`;
const sun=`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
function applyTheme(t){
  root.dataset.theme=t;
  themeIcon.innerHTML=t==="dark"?sun:moon;
  document.querySelector('meta[name="theme-color"]').setAttribute('content',t==="dark"?"#0b0c0f":"#f4f3ef");
}
applyTheme("dark");
themeBtn.onclick=()=>applyTheme(root.dataset.theme==="dark"?"light":"dark");

function applyLang(lang){
  root.dataset.lang=lang;
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-lang-select]").forEach(b=>b.classList.toggle("active",b.dataset.langSelect===lang));
  document.querySelectorAll("[data-t]").forEach(el=>{ const k=el.dataset.t; if(translations[lang][k]) el.textContent=translations[lang][k]; });
}
document.querySelectorAll("[data-lang-select]").forEach(b=>b.onclick=()=>applyLang(b.dataset.langSelect));
applyLang("en");