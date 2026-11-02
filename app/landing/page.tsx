import Link from "next/link";

const features = [
  { icon: "◉", title: "Análise de mercado", text: "Acompanhe os últimos ticks, dígitos e estatísticas num painel claro e organizado." },
  { icon: "↗", title: "Robôs de trading", text: "Conheça ferramentas automatizadas e configure a experiência de acordo com a sua estratégia." },
  { icon: "✦", title: "Análise inteligente", text: "Explore indicadores e sinais como apoio à sua própria avaliação do mercado." },
  { icon: "▤", title: "Histórico de operações", text: "Consulte os resultados e acompanhe o desempenho das suas operações num só lugar." },
];

export default function LandingPage() {
  return (
    <main className="izi-landing">
      <style>{`
        .izi-landing{--red:#e24b4a;--ink:#151a26;--muted:#687083;--line:#e8eaf0;--soft:#f7f8fb;background:#fff;color:var(--ink);font-family:Arial,Helvetica,sans-serif;overflow-x:clip}
        .izi-landing *{box-sizing:border-box}.izi-wrap{width:min(1160px,calc(100% - 40px));margin:0 auto}
        .izi-nav{height:82px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f0f1f5}
        .izi-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-weight:800;font-size:25px;letter-spacing:-1px}
        .izi-mark{width:38px;height:38px;border-radius:12px;background:var(--red);display:grid;place-items:center;color:#fff;font-size:22px;font-weight:900;box-shadow:0 7px 18px #e24b4a35}
        .izi-brand span span{color:var(--red)}.izi-tag{display:block;font-size:8px;letter-spacing:2.2px;margin-top:1px;color:#737b8d;font-weight:700}
        .izi-navlinks{display:flex;align-items:center;gap:30px}.izi-navlinks a{font-size:14px;color:#4f5667;text-decoration:none}.izi-navlinks a:hover{color:var(--red)}
        .izi-btn{display:inline-flex;justify-content:center;align-items:center;gap:9px;border-radius:10px;padding:13px 19px;text-decoration:none;font-weight:700;font-size:14px;transition:transform .18s,box-shadow .18s}
        .izi-btn:hover{transform:translateY(-2px)}.izi-primary{background:var(--red);color:#fff;box-shadow:0 9px 22px #e24b4a30}.izi-secondary{background:#fff;border:1px solid #dfe2e9;color:var(--ink)}
        .izi-hero{display:grid;grid-template-columns:1.03fr .97fr;gap:55px;align-items:center;padding:76px 0 80px}
        .izi-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:30px;background:#fff0f0;color:#bd3838;font-size:12px;font-weight:700}
        .izi-dot{width:7px;height:7px;background:var(--red);border-radius:50%}.izi-hero h1{font-size:clamp(42px,5vw,64px);line-height:1.04;letter-spacing:-2.8px;margin:22px 0 20px;max-width:620px}
        .izi-hero h1 em{font-style:normal;color:var(--red)}.izi-lead{font-size:17px;line-height:1.8;color:var(--muted);max-width:520px;margin:0 0 28px}
        .izi-actions{display:flex;flex-wrap:wrap;gap:12px}.izi-note{font-size:12px;color:#858b99;margin-top:18px}
        .izi-preview{position:relative;padding:22px;border-radius:25px;background:linear-gradient(145deg,#fff5f5,#f3f5fa 70%);border:1px solid #f0e5e5}
        .izi-dashboard{background:#fff;border:1px solid #e9ebf1;border-radius:17px;padding:19px;box-shadow:0 22px 55px #202b4512}
        .izi-dashhead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:18px;border-bottom:1px solid #eef0f5}
        .izi-dashtitle{font-size:13px;font-weight:800}.izi-live{font-size:10px;color:#15956c;background:#eaf8f1;padding:6px 8px;border-radius:20px;font-weight:700}
        .izi-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:15px 0}
        .izi-metric{padding:13px;border:1px solid #edf0f5;border-radius:12px}.izi-metric small{font-size:10px;color:#7b8291;display:block;margin-bottom:9px}.izi-metric strong{font-size:20px;letter-spacing:-.5px}.izi-positive{color:#15956c}.izi-red{color:var(--red)}
        .izi-chart{height:135px;background:linear-gradient(180deg,#fff4f4,#fff 90%);border:1px solid #f5e9e9;border-radius:12px;position:relative;overflow:hidden;padding:14px}
        .izi-chart svg{width:100%;height:100%}.izi-chartlabel{position:absolute;top:12px;left:14px;font-size:10px;color:#777f90;background:#fff;padding:4px 6px;border-radius:5px}
        .izi-bars{display:flex;gap:6px;align-items:end;height:55px;margin-top:14px}.izi-bars i{display:block;flex:1;border-radius:4px 4px 1px 1px;background:#f6b4b3}.izi-bars i:nth-child(3n){background:var(--red)}.izi-bars i:nth-child(2n){background:#f7d1d0}
        .izi-float{position:absolute;right:-13px;bottom:28px;background:#fff;border:1px solid #e9ebf1;border-radius:13px;padding:13px 16px;box-shadow:0 12px 30px #202b4514;font-size:11px;color:#687083}.izi-float strong{display:block;color:#151a26;font-size:15px;margin-top:5px}
        .izi-trust{border-top:1px solid #f0f1f5;border-bottom:1px solid #f0f1f5;padding:23px 0;text-align:center;color:#777f90;font-size:12px}.izi-trust strong{color:#343b4b}
        .izi-section{padding:82px 0}.izi-sectionhead{text-align:center;max-width:650px;margin:0 auto 38px}.izi-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--red);font-weight:800}.izi-section h2{font-size:clamp(29px,3.3vw,42px);letter-spacing:-1.4px;line-height:1.15;margin:13px 0}.izi-sectionhead p{color:var(--muted);line-height:1.75;font-size:15px}
        .izi-features{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.izi-card{border:1px solid var(--line);border-radius:16px;padding:24px 20px;background:#fff;min-height:205px}.izi-icon{display:grid;place-items:center;width:43px;height:43px;border-radius:12px;background:#fff0f0;color:var(--red);font-size:23px;font-weight:700;margin-bottom:19px}.izi-card h3{font-size:16px;margin:0 0 10px}.izi-card p{font-size:13px;line-height:1.7;color:var(--muted);margin:0}
        .izi-how{background:var(--soft)}.izi-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.izi-step{background:#fff;border:1px solid var(--line);border-radius:15px;padding:24px}.izi-number{font-size:12px;color:var(--red);font-weight:800;letter-spacing:1px}.izi-step h3{font-size:17px;margin:14px 0 8px}.izi-step p{font-size:13px;line-height:1.7;color:var(--muted);margin:0}
        .izi-cta{padding:60px 0}.izi-cta-box{border-radius:22px;padding:48px 30px;text-align:center;background:linear-gradient(120deg,#171d2b,#252d40);color:#fff}.izi-cta-box h2{font-size:clamp(28px,4vw,42px);letter-spacing:-1.4px;margin:0 0 13px}.izi-cta-box p{color:#c0c6d2;line-height:1.7;margin:0 auto 25px;max-width:620px;font-size:14px}
        .izi-footer{border-top:1px solid #eceef3;padding:25px 0;display:flex;justify-content:space-between;align-items:center;gap:20px;color:#858b99;font-size:12px}.izi-footerlinks{display:flex;gap:18px;flex-wrap:wrap}.izi-footer a{color:#687083;text-decoration:none}
        .izi-community{padding:48px 0 20px}
        .izi-community-panel{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);align-items:center;gap:28px;padding:30px;border:1px solid #e5e9f1;border-radius:20px;background:linear-gradient(120deg,#f8faff,#fff 70%)}
        .izi-community-copy h2{font-size:clamp(24px,3vw,34px);letter-spacing:-1px;line-height:1.15;margin:10px 0}
        .izi-community-copy p{font-size:14px;line-height:1.7;color:var(--muted);margin:0}
        .izi-community-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
        .izi-telegram{background:#229ed9;color:#fff;border:1px solid #229ed9;padding:12px 14px;box-shadow:0 6px 16px #229ed923}
        .izi-telegram:hover{box-shadow:0 9px 20px #229ed933}
        .izi-telegram svg{width:18px;height:18px;flex:0 0 18px}
        .izi-whatsapp-support{position:fixed;right:22px;bottom:22px;z-index:10000;width:56px;height:56px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#25D366;color:#fff;text-decoration:none;box-shadow:0 8px 20px rgba(16,24,40,.16);transition:filter .18s}
        .izi-whatsapp-support:hover,.izi-whatsapp-support:focus-visible{filter:brightness(.96)}
        .izi-whatsapp-support svg{width:29px;height:29px;flex:0 0 29px;display:block}
        @media(max-width:600px){.izi-whatsapp-support{right:22px;bottom:22px;width:56px;height:56px;padding:0}}

        @media(max-width:900px){.izi-hero{grid-template-columns:1fr;gap:40px;padding:56px 0}.izi-hero-copy{max-width:700px}.izi-preview{max-width:650px;width:100%;margin:0 auto}.izi-features{grid-template-columns:repeat(2,minmax(0,1fr))}.izi-navlinks{gap:16px}}
        @media(max-width:900px){.izi-community-panel{grid-template-columns:1fr;gap:22px}.izi-community-actions{justify-content:flex-start}}
        @media(max-width:600px){.izi-wrap{width:min(100% - 30px,1160px)}.izi-nav{height:70px}.izi-brand{font-size:22px}.izi-mark{width:34px;height:34px}.izi-tag{font-size:7px}.izi-navlinks>a:not(.izi-btn){display:none}.izi-navlinks{gap:0}.izi-navlinks .izi-btn{padding:10px 12px;font-size:12px}.izi-navlinks .izi-deriv{display:none}.izi-hero{padding:43px 0 50px;gap:34px}.izi-hero h1{font-size:43px;letter-spacing:-1.8px}.izi-lead{font-size:15px}.izi-actions .izi-btn{flex:1}.izi-preview{padding:12px;border-radius:18px}.izi-dashboard{padding:13px}.izi-metric{padding:10px}.izi-metric strong{font-size:17px}.izi-float{right:4px;bottom:10px}.izi-section{padding:58px 0}.izi-features{gap:10px}.izi-card{padding:17px 14px;min-height:0}.izi-card h3{font-size:14px}.izi-card p{font-size:12px}.izi-icon{width:38px;height:38px;margin-bottom:14px}.izi-steps{grid-template-columns:1fr;gap:12px}.izi-cta{padding:40px 0}.izi-cta-box{padding:35px 20px}.izi-footer{align-items:flex-start;flex-direction:column}.izi-footerlinks{gap:13px}}
      `}</style>

      <header className="izi-wrap izi-nav">
        <Link href="/landing" className="izi-brand" aria-label="Izitrader início">
          <span className="izi-mark">↗</span>
          <span><span>Izi</span>trader<span className="izi-tag">TRADE OPTIONS</span></span>
        </Link>
        <nav className="izi-navlinks" aria-label="Navegação principal">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#como-comecar">Como começar</a>
          <a href="#telegram">Telegram</a>
          <Link href="/?mode=login" className="izi-btn izi-secondary">Entrar</Link>
          <Link href="/?mode=deriv" className="izi-btn izi-secondary izi-deriv">Entrar com Deriv</Link>
          <Link href="/register" className="izi-btn izi-primary">Começar agora <span>→</span></Link>
        </nav>
      </header>

      <section className="izi-wrap izi-hero">
        <div className="izi-hero-copy">
          <span className="izi-pill"><span className="izi-dot" /> A sua experiência de trading, num só lugar</span>
          <h1>Explore o mercado.<br /><em>Decida com clareza.</em></h1>
          <p className="izi-lead">Conheça a Izitrader: ferramentas de análise, acompanhamento de operações e estratégias reunidas numa experiência simples, moderna e adaptada ao seu dispositivo.</p>
          <div className="izi-actions">
            <Link href="/register" className="izi-btn izi-primary">Criar conta grátis <span>→</span></Link>
            <a href="#funcionalidades" className="izi-btn izi-secondary">Explorar funcionalidades</a>
          </div>
          <p className="izi-note">Interface para computador e telemóvel · Português e inglês</p>
        </div>
        <div className="izi-preview" aria-label="Pré-visualização ilustrativa do painel Izitrader">
          <div className="izi-dashboard">
            <div className="izi-dashhead"><div className="izi-dashtitle">Visão geral do mercado</div><span className="izi-live">● DEMONSTRAÇÃO</span></div>
            <div className="izi-metrics">
              <div className="izi-metric"><small>Ferramentas de análise</small><strong>Em tempo real*</strong></div>
              <div className="izi-metric"><small>Estado da plataforma</small><strong className="izi-positive">Pronta a explorar</strong></div>
            </div>
            <div className="izi-chart"><span className="izi-chartlabel">Visual ilustrativo</span><svg viewBox="0 0 400 110" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="iziFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e24b4a" stopOpacity=".22"/><stop offset="100%" stopColor="#e24b4a" stopOpacity="0"/></linearGradient></defs><path d="M0 82 L25 70 L47 76 L70 48 L91 59 L116 42 L137 52 L160 28 L184 43 L206 35 L229 55 L250 33 L275 44 L296 20 L318 35 L340 15 L362 29 L382 10 L400 18 L400 110 L0 110Z" fill="url(#iziFill)"/><polyline points="0,82 25,70 47,76 70,48 91,59 116,42 137,52 160,28 184,43 206,35 229,55 250,33 275,44 296,20 318,35 340,15 362,29 382,10 400,18" fill="none" stroke="#e24b4a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/></svg></div>
            <div className="izi-bars" aria-hidden="true">{[35,53,42,70,48,82,58,65,43,76,57,91,50,70,61,84,46,66,54,79].map((height,i)=><i key={i} style={{height:height+"%"}} />)}</div>
          </div>
          <div className="izi-float">Ferramentas organizadas<strong>Num único painel</strong></div>
        </div>
      </section>

      <div className="izi-trust"><div className="izi-wrap">Feita para uma experiência <strong>simples, intuitiva e responsiva</strong> em todos os ecrãs.</div></div>

      <section id="telegram" className="izi-wrap izi-community" aria-labelledby="izi-community-title">
        <div className="izi-community-panel">
          <div className="izi-community-copy">
            <span className="izi-eyebrow">Comunidade Izitrader</span>
            <h2 id="izi-community-title">Junte-se aos nossos grupos no Telegram.</h2>
            <p>Receba apoio e acompanhe a comunidade em português ou inglês. Escolha o grupo adequado abaixo.</p>
          </div>
          <div className="izi-community-actions">
            <a className="izi-btn izi-telegram" href="https://t.me/izitraderpt" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M21.7 3.3 18.4 20c-.3 1.2-1 1.5-2 .9l-5.4-4-2.6 2.5c-.3.3-.5.5-1 .5l.4-5.5 10-9c.4-.4-.1-.6-.6-.2L5.1 13.1.1 11.5c-1.1-.3-1.1-1.1.2-1.6L20 3.9c.9-.3 1.7-.1 1.7-.6Z"/></svg>
              Grupo Telegram Português
            </a>
            <a className="izi-btn izi-telegram" href="https://t.me/izitraderen" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M21.7 3.3 18.4 20c-.3 1.2-1 1.5-2 .9l-5.4-4-2.6 2.5c-.3.3-.5.5-1 .5l.4-5.5 10-9c.4-.4-.1-.6-.6-.2L5.1 13.1.1 11.5c-1.1-.3-1.1-1.1.2-1.6L20 3.9c.9-.3 1.7-.1 1.7-.6Z"/></svg>
              Telegram Group English
            </a>
            <a className="izi-btn izi-telegram" href="https://t.me/Ezidro_fx" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M21.7 3.3 18.4 20c-.3 1.2-1 1.5-2 .9l-5.4-4-2.6 2.5c-.3.3-.5.5-1 .5l.4-5.5 10-9c.4-.4-.1-.6-.6-.2L5.1 13.1.1 11.5c-1.1-.3-1.1-1.1.2-1.6L20 3.9c.9-.3 1.7-.1 1.7-.6Z"/></svg>
              Suporte Telegram
            </a>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="izi-wrap izi-section">
        <div className="izi-sectionhead"><span className="izi-eyebrow">Funcionalidades</span><h2>As ferramentas de que precisa,<br />numa experiência integrada.</h2><p>Explore os recursos disponíveis na Izitrader e encontre as ferramentas que melhor se ajustam à sua forma de analisar o mercado.</p></div>
        <div className="izi-features">{features.map((feature)=><article className="izi-card" key={feature.title}><div className="izi-icon">{feature.icon}</div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
      </section>

      <section id="como-comecar" className="izi-section izi-how">
        <div className="izi-wrap"><div className="izi-sectionhead"><span className="izi-eyebrow">Comece em poucos passos</span><h2>Uma entrada simples na plataforma.</h2><p>Crie o seu acesso e explore as ferramentas com atenção às funcionalidades e aos riscos envolvidos.</p></div>
          <div className="izi-steps"><article className="izi-step"><span className="izi-number">PASSO 01</span><h3>Crie a sua conta</h3><p>Registe-se na Izitrader para preparar o seu acesso à plataforma.</p></article><article className="izi-step"><span className="izi-number">PASSO 02</span><h3>Conecte a sua conta</h3><p>Quando aplicável, siga o fluxo de ligação à Deriv disponível na plataforma.</p></article><article className="izi-step"><span className="izi-number">PASSO 03</span><h3>Explore as ferramentas</h3><p>Conheça as análises, configurações e o histórico antes de tomar decisões de negociação.</p></article></div>
        </div>
      </section>

      <section className="izi-wrap izi-cta"><div className="izi-cta-box"><h2>Pronto para conhecer a Izitrader?</h2><p>Entre na plataforma e descubra uma interface criada para reunir as suas ferramentas de análise e acompanhamento.</p><div className="izi-actions" style={{justifyContent:"center"}}><Link href="/register" className="izi-btn izi-primary">Começar agora <span>→</span></Link><Link href="/?mode=deriv" className="izi-btn izi-secondary">Entrar com Deriv</Link></div></div></section>

      <footer className="izi-wrap izi-footer"><div>© {new Date().getFullYear()} Izitrader. Todos os direitos reservados.</div><div className="izi-footerlinks"><a href="#funcionalidades">Funcionalidades</a><a href="#telegram">Telegram</a><Link href="/?mode=login">Entrar</Link><Link href="/register">Criar conta</Link></div><div>Negociar envolve risco de perda financeira. Ferramentas de análise não garantem resultados.</div></footer>

      <a className="izi-whatsapp-support" href="https://wa.me/message/24C6LXTACVVWP1" target="_blank" rel="noopener noreferrer" aria-label="Suporte WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M20.52 3.48A11.76 11.76 0 0 0 12.17 0C5.67 0 .38 5.28.38 11.78c0 2.08.54 4.11 1.58 5.9L.27 24l6.49-1.7a11.8 11.8 0 0 0 5.41 1.3h.01c6.5 0 11.78-5.28 11.78-11.78 0-3.15-1.23-6.11-3.44-8.34z"/>
          <path fill="#25D366" d="M17.65 14.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.49s1.08 2.9 1.23 3.1c.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.58-.09 1.77-.73 2.02-1.44.25-.72.25-1.33.17-1.46-.08-.13-.27-.2-.57-.35z"/>
        </svg>
      </a>
    </main>
  );
}
