// src/app/privacidade/page.tsx

export const metadata = {
  title: "Política de Privacidade | ErizonAI",
  description: "Política de Privacidade da plataforma ErizonAI — como coletamos, usamos e protegemos seus dados.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#060608] text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">

        <div className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-3">Legal</p>
          <h1 className="text-[2.2rem] font-black italic uppercase tracking-tight mb-4">Política de Privacidade</h1>
          <p className="text-[13px] text-white/30">Última atualização: fevereiro de 2025</p>
        </div>

        <div className="space-y-10 text-[14px] text-white/50 leading-relaxed">

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">1. Quem somos</h2>
            <p>
              A <strong className="text-white">ErizonAI</strong> ("Erizon", "nós", "nossa") é uma plataforma brasileira de inteligência artificial para gestão de campanhas de tráfego pago, acessível em <strong className="text-white">erizon.vercel.app</strong>. Somos responsáveis pelo tratamento dos dados pessoais coletados através da nossa plataforma, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">2. Dados que coletamos</h2>
            <p className="mb-4">Coletamos os seguintes dados para operar a plataforma:</p>
            <div className="space-y-3">
              {[
                { titulo: "Dados de cadastro", desc: "Nome, e-mail e senha para criação e acesso à conta." },
                { titulo: "Dados de integração Meta Ads", desc: "Access Token e Ad Account ID fornecidos pelo usuário para conectar a conta Meta. Esses tokens são armazenados de forma criptografada e nunca compartilhados com terceiros." },
                { titulo: "Dados de campanhas", desc: "Métricas de campanhas sincronizadas via Meta API: gasto, leads, ROAS, CPL, CTR, impressões e outros indicadores de performance." },
                { titulo: "Dados de clientes", desc: "Informações inseridas pelo usuário sobre seus clientes (nome, segmento, configurações de campanha) para organização interna da plataforma." },
                { titulo: "Dados de uso", desc: "Logs de acesso, páginas visitadas, ações realizadas na plataforma — usados para melhorar a experiência e identificar erros." },
                { titulo: "Dados de pagamento", desc: "Processados exclusivamente pelo Stripe. A ErizonAI não armazena dados de cartão de crédito." },
              ].map((item, i) => (
                <div key={i} className="pl-4 border-l border-white/[0.08]">
                  <p className="text-white font-semibold mb-1">{item.titulo}</p>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">3. Como usamos seus dados</h2>
            <p className="mb-4">Utilizamos seus dados exclusivamente para:</p>
            <ul className="space-y-2">
              {[
                "Operar e fornecer os serviços da plataforma ErizonAI",
                "Sincronizar e analisar dados de campanhas via Meta API",
                "Enviar alertas e notificações via Telegram quando configurado",
                "Processar pagamentos e gerenciar assinaturas",
                "Melhorar a plataforma com base no uso agregado e anonimizado",
                "Cumprir obrigações legais e regulatórias",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">4. Base legal para o tratamento</h2>
            <p>
              O tratamento dos seus dados é realizado com base nas seguintes hipóteses previstas na LGPD:
            </p>
            <ul className="space-y-2 mt-3">
              {[
                "Execução de contrato — para fornecer os serviços contratados",
                "Legítimo interesse — para melhoria da plataforma e segurança",
                "Consentimento — para envio de comunicações de marketing (quando aplicável)",
                "Cumprimento de obrigação legal — para atender exigências fiscais e regulatórias",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">5. Compartilhamento de dados</h2>
            <p className="mb-4">Seus dados são compartilhados apenas com:</p>
            <div className="space-y-3">
              {[
                { titulo: "Supabase", desc: "Nosso provedor de banco de dados e autenticação, hospedado em servidores seguros." },
                { titulo: "Stripe", desc: "Processador de pagamentos para gerenciar assinaturas. Sujeito à política de privacidade do Stripe." },
                { titulo: "Vercel", desc: "Provedor de hospedagem da plataforma." },
                { titulo: "Meta Platforms", desc: "A conexão com a Meta API é realizada com suas credenciais para buscar dados de campanhas." },
              ].map((item, i) => (
                <div key={i} className="pl-4 border-l border-white/[0.08]">
                  <p className="text-white font-semibold mb-1">{item.titulo}</p>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins comerciais.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">6. Segurança dos dados</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo: criptografia de tokens de acesso, controle de acesso por autenticação, isolamento de dados por usuário via Row Level Security (RLS) no banco de dados, e transmissão de dados via HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">7. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento da conta, os dados são excluídos em até 90 dias, exceto quando a retenção for exigida por obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">8. Seus direitos (LGPD)</h2>
            <p className="mb-4">Como titular de dados, você tem direito a:</p>
            <ul className="space-y-2">
              {[
                "Confirmar a existência de tratamento dos seus dados",
                "Acessar seus dados pessoais",
                "Corrigir dados incompletos, inexatos ou desatualizados",
                "Solicitar a anonimização, bloqueio ou eliminação dos dados",
                "Portabilidade dos dados a outro fornecedor",
                "Revogar o consentimento a qualquer momento",
                "Solicitar a exclusão completa da sua conta e dados",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Para exercer seus direitos, entre em contato pelo e-mail: <strong className="text-white">privacidade@erizon.com.br</strong>
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">9. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento publicitário. Você pode gerenciar cookies nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">10. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos usuários sobre mudanças relevantes por e-mail ou via notificação na plataforma. O uso continuado da plataforma após as alterações implica aceitação da nova política.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">11. Contato</h2>
            <p>
              Para dúvidas, solicitações ou exercício dos seus direitos como titular de dados:
            </p>
            <div className="mt-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1">
              <p><strong className="text-white">ErizonAI</strong></p>
              <p>E-mail: <strong className="text-purple-400">privacidade@erizon.com.br</strong></p>
              <p>Site: <strong className="text-purple-400">erizon.vercel.app</strong></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}