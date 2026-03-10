'use client';

import { useState } from 'react';

export default function LandingPagePamela() {
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [wppLink, setWppLink] = useState('');

  function maskTel(value: string) {
    let v = value.replace(/\D/g, '').slice(0, 11);
    if (v.length >= 7) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length >= 3) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    return v;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const telRaw = tel.replace(/\D/g, '');
    if (!nome || telRaw.length < 10) {
      alert('Por favor, preencha seu nome e WhatsApp corretamente.');
      return;
    }
    setLoading(true);
    const telFormatado = telRaw.length === 11 ? `55${telRaw}` : telRaw;
    try {
      await fetch('/api/leads/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_lead: nome,
          telefone: telFormatado,
          canal: 'landing_page',
          status: 'novo',
        }),
      });
    } catch (err) {
      console.error(err);
    }
    const msg = encodeURIComponent(
      `Olá Pamela! Me chamo ${nome} e tenho interesse em conhecer imóveis de alto padrão em Americana. Pode me ajudar?`
    );
    const link = `https://wa.me/5519983308442?text=${msg}`;
    setWppLink(link);
    setSucesso(true);
    setLoading(false);
    setTimeout(() => window.open(link, '_blank'), 2000);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --verde: #1a3a2a; --verde-m: #22472f; --verde-l: #2d5c3d; --verde-xl: #3a7a52;
          --ouro: #c9a84c; --ouro-l: #e2c47a; --ouro-xl: #f0d898;
          --creme: #f5f0e8; --creme-l: #faf7f2;
          --txt-escuro: #1a1a1a; --txt-medio: #4a4a4a; --txt-claro: #8a8a8a; --branco: #ffffff;
        }
        html { scroll-behavior: smooth; }
        body { font-family: 'Jost', system-ui, sans-serif; background: var(--creme-l); color: var(--txt-escuro); overflow-x: hidden; }
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 18px 60px; display: flex; align-items: center; justify-content: space-between; background: rgba(26,58,42,0.96); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(201,168,76,0.2); }
        .nav-logo { display: flex; flex-direction: column; text-decoration: none; }
        .nav-logo-nome { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; color: var(--ouro-l); letter-spacing: 2px; text-transform: uppercase; }
        .nav-logo-cargo { font-size: 9px; color: rgba(201,168,76,0.5); letter-spacing: 3px; text-transform: uppercase; margin-top: 2px; }
        .nav-tel { font-size: 13px; color: rgba(255,255,255,0.6); text-decoration: none; letter-spacing: 0.5px; transition: color 0.2s; }
        .nav-tel:hover { color: var(--ouro-l); }
        .hero { position: relative; min-height: 100vh; background: var(--verde); display: grid; grid-template-columns: 1fr 480px; overflow: hidden; }
        .hero-bg-pattern { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 80% at -10% 50%, rgba(201,168,76,0.06) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 110% 20%, rgba(201,168,76,0.04) 0%, transparent 50%); }
        .hero-lines { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .hero-lines::before { content: ''; position: absolute; top: -50%; right: 38%; width: 1px; height: 200%; background: linear-gradient(to bottom, transparent, rgba(201,168,76,0.15), transparent); transform: rotate(15deg); }
        .hero-esq { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: center; padding: 120px 60px 80px; }
        .hero-selo { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 32px; opacity: 0; animation: fadeUp 0.8s 0.2s ease forwards; }
        .hero-selo-linha { width: 32px; height: 1px; background: var(--ouro); }
        .hero-selo-txt { font-size: 10px; font-weight: 500; color: var(--ouro); letter-spacing: 4px; text-transform: uppercase; }
        .hero-titulo { font-family: 'Cormorant Garamond', serif; font-size: clamp(42px, 5vw, 68px); font-weight: 300; line-height: 1.1; color: var(--branco); letter-spacing: -1px; margin-bottom: 24px; opacity: 0; animation: fadeUp 0.8s 0.35s ease forwards; }
        .hero-titulo em { font-style: italic; color: var(--ouro-l); }
        .hero-titulo strong { font-weight: 600; display: block; }
        .hero-desc { font-size: 15px; font-weight: 300; color: rgba(255,255,255,0.55); line-height: 1.8; max-width: 420px; margin-bottom: 48px; opacity: 0; animation: fadeUp 0.8s 0.5s ease forwards; }
        .hero-stats { display: flex; gap: 40px; margin-bottom: 48px; opacity: 0; animation: fadeUp 0.8s 0.65s ease forwards; }
        .stat-num { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 600; color: var(--ouro-l); line-height: 1; }
        .stat-txt { font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
        .stat-div { width: 1px; background: rgba(201,168,76,0.2); }
        .hero-foto-wrap { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: center; padding-top: 80px; overflow: hidden; }
        .hero-foto-bg { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 340px; height: 480px; background: linear-gradient(to top, rgba(201,168,76,0.08), transparent); border-radius: 200px 200px 0 0; }
        .hero-foto { position: relative; z-index: 2; width: 380px; object-fit: contain; object-position: bottom; animation: fadeUp 1s 0.4s ease both; filter: drop-shadow(0 0 40px rgba(0,0,0,0.3)); }
        .form-flutuante { position: absolute; right: 60px; top: 50%; transform: translateY(-50%); z-index: 10; width: 360px; background: var(--creme-l); border-radius: 20px; padding: 36px 32px; box-shadow: 0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.15); animation: fadeLeft 0.9s 0.6s ease both; }
        @keyframes fadeLeft { from { opacity: 0; transform: translateY(-50%) translateX(30px); } to { opacity: 1; transform: translateY(-50%) translateX(0); } }
        .form-topo { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
        .form-topo-linha { width: 24px; height: 2px; background: var(--ouro); }
        .form-subtag { font-size: 9px; font-weight: 600; color: var(--ouro); letter-spacing: 3px; text-transform: uppercase; }
        .form-titulo { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; color: var(--verde); line-height: 1.2; margin-bottom: 6px; letter-spacing: -0.5px; }
        .form-desc { font-size: 12px; color: var(--txt-claro); margin-bottom: 24px; }
        .campo { margin-bottom: 14px; }
        .campo label { display: block; font-size: 9px; font-weight: 600; color: var(--txt-medio); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
        .campo input { width: 100%; padding: 12px 14px; border: 1.5px solid #e0d8cc; border-radius: 10px; font-family: 'Jost', sans-serif; font-size: 13px; color: var(--txt-escuro); background: var(--branco); transition: border-color 0.2s, box-shadow 0.2s; outline: none; }
        .campo input:focus { border-color: var(--ouro); box-shadow: 0 0 0 3px rgba(201,168,76,0.1); }
        .campo input::placeholder { color: #c0b8ac; }
        .tel-wrap { position: relative; }
        .tel-flag { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--txt-medio); font-weight: 500; display: flex; align-items: center; gap: 5px; pointer-events: none; }
        .tel-wrap input { padding-left: 68px; }
        .btn-cta { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--verde), var(--verde-m)); color: var(--ouro-l); font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 600; border: 1px solid rgba(201,168,76,0.25); border-radius: 10px; cursor: pointer; margin-top: 6px; letter-spacing: 2px; text-transform: uppercase; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-cta:hover { background: linear-gradient(135deg, var(--verde-m), var(--verde-l)); box-shadow: 0 8px 24px rgba(26,58,42,0.25); transform: translateY(-1px); }
        .btn-cta:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .form-privacidade { text-align: center; font-size: 10px; color: var(--txt-claro); margin-top: 12px; }
        .form-sucesso { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; }
        .sucesso-icone { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, var(--verde), var(--verde-l)); display: flex; align-items: center; justify-content: center; font-size: 24px; animation: pop 0.5s ease; border: 2px solid rgba(201,168,76,0.3); }
        .sucesso-titulo { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: var(--verde); }
        .sucesso-sub { font-size: 12px; color: var(--txt-claro); line-height: 1.6; }
        .btn-wpp { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px; background: #25d366; color: var(--branco); font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 600; border: none; border-radius: 10px; cursor: pointer; text-decoration: none; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 16px rgba(37,211,102,0.25); transition: all 0.2s; }
        .btn-wpp:hover { transform: translateY(-1px); }
        .sobre { display: grid; grid-template-columns: 1fr 1fr; background: var(--creme-l); overflow: hidden; }
        .sobre-esq { background: var(--verde); position: relative; overflow: hidden; min-height: 500px; display: flex; align-items: center; justify-content: center; }
        .sobre-esq-pattern { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, rgba(201,168,76,0.03) 0px, rgba(201,168,76,0.03) 1px, transparent 1px, transparent 20px); }
        .sobre-esq-content { position: relative; z-index: 1; text-align: center; padding: 60px 40px; }
        .sobre-numero { font-family: 'Cormorant Garamond', serif; font-size: 96px; font-weight: 300; color: rgba(201,168,76,0.15); line-height: 1; margin-bottom: -20px; }
        .sobre-anos-txt { font-size: 11px; letter-spacing: 5px; color: var(--ouro); text-transform: uppercase; margin-bottom: 32px; }
        .sobre-divider { width: 40px; height: 1px; background: var(--ouro); margin: 0 auto 24px; }
        .sobre-quote { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-style: italic; font-weight: 300; color: rgba(255,255,255,0.7); line-height: 1.6; max-width: 280px; margin: 0 auto; }
        .sobre-dir { padding: 80px 60px; display: flex; flex-direction: column; justify-content: center; }
        .sobre-tag { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
        .sobre-tag-linha { width: 24px; height: 1px; background: var(--ouro); }
        .sobre-tag-txt { font-size: 9px; font-weight: 600; color: var(--ouro); letter-spacing: 4px; text-transform: uppercase; }
        .sobre-titulo { font-family: 'Cormorant Garamond', serif; font-size: 38px; font-weight: 400; color: var(--verde); line-height: 1.2; margin-bottom: 20px; }
        .sobre-txt { font-size: 14px; font-weight: 300; color: var(--txt-medio); line-height: 1.9; margin-bottom: 32px; }
        .sobre-pilares { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .pilar { display: flex; align-items: flex-start; gap: 10px; }
        .pilar-icone { width: 28px; height: 28px; border-radius: 7px; background: rgba(26,58,42,0.06); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
        .pilar-txt { font-size: 12px; font-weight: 500; color: var(--txt-medio); line-height: 1.5; }
        .diferenciais { background: var(--verde); padding: 80px 60px; position: relative; overflow: hidden; }
        .diferenciais-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 60% at 50% 100%, rgba(201,168,76,0.05) 0%, transparent 60%); }
        .diferenciais-header { text-align: center; margin-bottom: 56px; }
        .diferenciais-tag { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .sec-linha { width: 24px; height: 1px; background: var(--ouro); }
        .sec-tag-txt { font-size: 9px; font-weight: 600; color: var(--ouro); letter-spacing: 4px; text-transform: uppercase; }
        .diferenciais-titulo { font-family: 'Cormorant Garamond', serif; font-size: 42px; font-weight: 300; color: var(--branco); line-height: 1.2; }
        .diferenciais-titulo em { font-style: italic; color: var(--ouro-l); }
        .diferenciais-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 960px; margin: 0 auto; }
        .dif-card { padding: 32px 28px; border: 1px solid rgba(201,168,76,0.12); border-radius: 16px; background: rgba(255,255,255,0.03); transition: all 0.3s; }
        .dif-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(201,168,76,0.25); transform: translateY(-4px); }
        .dif-num { font-family: 'Cormorant Garamond', serif; font-size: 44px; font-weight: 300; color: rgba(201,168,76,0.2); line-height: 1; margin-bottom: 12px; }
        .dif-titulo { font-size: 14px; font-weight: 600; color: var(--ouro-l); margin-bottom: 8px; }
        .dif-txt { font-size: 12px; font-weight: 300; color: rgba(255,255,255,0.45); line-height: 1.7; }
        footer { background: #0f2118; padding: 40px 60px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(201,168,76,0.1); }
        .footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 16px; color: var(--ouro-l); letter-spacing: 2px; text-transform: uppercase; }
        .footer-creci { font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 2px; margin-top: 4px; }
        .footer-txt { font-size: 11px; color: rgba(255,255,255,0.2); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.5); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(201,168,76,0.3); border-top-color: var(--ouro-l); border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .nav { padding: 16px 24px; }
          .hero { grid-template-columns: 1fr; min-height: auto; padding-bottom: 40px; }
          .hero-esq { padding: 100px 24px 40px; }
          .hero-foto-wrap { min-height: 300px; }
          .hero-foto { width: 260px; }
          .form-flutuante { position: static; transform: none; width: calc(100% - 48px); margin: 0 24px 40px; animation: fadeUp 0.7s ease both; }
          .sobre { grid-template-columns: 1fr; }
          .sobre-dir { padding: 48px 24px; }
          .diferenciais { padding: 60px 24px; }
          .diferenciais-grid { grid-template-columns: 1fr; }
          footer { flex-direction: column; gap: 12px; text-align: center; padding: 32px 24px; }
        }
      `}</style>

      <nav className="nav">
        <a href="https://pamelabatistacorretora.com.br" className="nav-logo">
          <span className="nav-logo-nome">Pamela Batista</span>
          <span className="nav-logo-cargo">Corretora de Imóveis · CRECI</span>
        </a>
        <a href="tel:+5519983308442" className="nav-tel">(19) 98330-8442</a>
      </nav>

      <section className="hero">
        <div className="hero-bg-pattern" />
        <div className="hero-lines" />

        <div className="hero-esq">
          <div className="hero-selo">
            <div className="hero-selo-linha" />
            <span className="hero-selo-txt">Alto Padrão · Americana &amp; Região</span>
          </div>
          <h1 className="hero-titulo">
            <em>Você tem um sonho,</em>
            <strong>eu tenho a chave.</strong>
          </h1>
          <p className="hero-desc">
            Especialista em imóveis de alto padrão em Americana, Nova Odessa e SBO.
            Atendimento exclusivo, com cuidado em cada detalhe — do primeiro contato à entrega das chaves.
          </p>
          <div className="hero-stats">
            <div>
              <div className="stat-num">+200</div>
              <div className="stat-txt">Famílias realizadas</div>
            </div>
            <div className="stat-div" />
            <div>
              <div className="stat-num">100%</div>
              <div className="stat-txt">Dedicação exclusiva</div>
            </div>
            <div className="stat-div" />
            <div>
              <div className="stat-num">Top</div>
              <div className="stat-txt">Alto padrão</div>
            </div>
          </div>
        </div>

        <div className="hero-foto-wrap">
          <div className="hero-foto-bg" />
        </div>

        <div className="form-flutuante">
          {!sucesso ? (
            <>
              <div className="form-topo">
                <div className="form-topo-linha" />
                <span className="form-subtag">Atendimento exclusivo</span>
              </div>
              <h2 className="form-titulo">Quero conhecer<br />meu imóvel ideal</h2>
              <p className="form-desc">Preencha abaixo e falarei com você pessoalmente.</p>
              <form onSubmit={handleSubmit}>
                <div className="campo">
                  <label htmlFor="nome">Seu nome</label>
                  <input
                    type="text" id="nome" placeholder="Como posso te chamar?"
                    autoComplete="name" required
                    value={nome} onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label htmlFor="tel">WhatsApp</label>
                  <div className="tel-wrap">
                    <span className="tel-flag">🇧🇷 +55</span>
                    <input
                      type="tel" id="tel" placeholder="(19) 99999-9999"
                      autoComplete="tel" required
                      value={tel} onChange={(e) => setTel(maskTel(e.target.value))}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-cta" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Quero ser atendida por você'}
                </button>
              </form>
              <p className="form-privacidade">🔒 Seus dados são confidenciais e protegidos.</p>
            </>
          ) : (
            <div className="form-sucesso">
              <div className="sucesso-icone">🏠</div>
              <h3 className="sucesso-titulo">Que alegria!</h3>
              <p className="sucesso-sub">Recebi seu contato com carinho.<br />Em breve estarei com você pelo WhatsApp.</p>
              <a href={wppLink} className="btn-wpp" target="_blank" rel="noreferrer">
                💬 Falar agora com a Pamela
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="sobre">
        <div className="sobre-esq">
          <div className="sobre-esq-pattern" />
          <div className="sobre-esq-content">
            <div className="sobre-numero">10</div>
            <div className="sobre-anos-txt">Anos de experiência</div>
            <div className="sobre-divider" />
            <p className="sobre-quote">
              &ldquo;Eu não vendo imóveis.<br />Eu realizo sonhos com<br />dedicação exclusiva.&rdquo;
            </p>
          </div>
        </div>
        <div className="sobre-dir">
          <div className="sobre-tag">
            <div className="sobre-tag-linha" />
            <span className="sobre-tag-txt">Sobre Pamela Batista</span>
          </div>
          <h2 className="sobre-titulo">Sofisticação e empatia<br />em cada negociação</h2>
          <p className="sobre-txt">
            Especialista em imóveis de alto padrão em Americana e região, Pamela une expertise técnica
            com um olhar sensível para os detalhes de acabamento que fazem a diferença. Quando se dedica
            exclusivamente a um imóvel, ela vende — com histórico comprovado e clientes que voltam sempre.
          </p>
          <div className="sobre-pilares">
            <div className="pilar"><div className="pilar-icone">✦</div><span className="pilar-txt">Venda rápida em exclusividade</span></div>
            <div className="pilar"><div className="pilar-icone">◆</div><span className="pilar-txt">Especialista em acabamentos</span></div>
            <div className="pilar"><div className="pilar-icone">◇</div><span className="pilar-txt">Acompanhamento completo</span></div>
            <div className="pilar"><div className="pilar-icone">❖</div><span className="pilar-txt">Alto padrão Americana · SBO</span></div>
          </div>
        </div>
      </section>

      <section className="diferenciais">
        <div className="diferenciais-bg" />
        <div className="diferenciais-header">
          <div className="diferenciais-tag">
            <div className="sec-linha" />
            <span className="sec-tag-txt">Por que escolher a Pamela</span>
            <div className="sec-linha" />
          </div>
          <h2 className="diferenciais-titulo">O que me faz <em>diferente</em></h2>
        </div>
        <div className="diferenciais-grid">
          <div className="dif-card">
            <div className="dif-num">01</div>
            <div className="dif-titulo">Exclusividade Total</div>
            <p className="dif-txt">Quando me comprometo com um imóvel, minha dedicação é completa. Resultado: venda rápida e ao melhor preço.</p>
          </div>
          <div className="dif-card">
            <div className="dif-num">02</div>
            <div className="dif-titulo">Olhar Especialista</div>
            <p className="dif-txt">Valorizo cada detalhe de acabamento que outros corretores não percebem — e isso faz diferença no preço final.</p>
          </div>
          <div className="dif-card">
            <div className="dif-num">03</div>
            <div className="dif-titulo">Pós-venda Humanizado</div>
            <p className="dif-txt">A relação não termina na assinatura. Acompanho cada etapa até a entrega das chaves — e além.</p>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <div className="footer-logo">Pamela Batista</div>
          <div className="footer-creci">Corretora de Imóveis · Americana &amp; Região</div>
        </div>
        <div className="footer-txt">© 2025 · Todos os direitos reservados</div>
      </footer>
    </>
  );
}