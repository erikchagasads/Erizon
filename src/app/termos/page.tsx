// src/app/termos/page.tsx

export const metadata = {
  title: "Termos de Uso | ErizonAI",
  description: "Termos de Uso da plataforma ErizonAI.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#060608] text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">

        <div className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-3">Legal</p>
          <h1 className="text-[2.2rem] font-black italic uppercase tracking-tight mb-4">Termos de Uso</h1>
          <p className="text-[13px] text-white/30">Última atualização: fevereiro de 2025</p>
        </div>

        <div className="space-y-10 text-[14px] text-white/50 leading-relaxed">

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">1. Aceitação dos termos</h2>
            <p>
              Ao acessar ou usar a plataforma <strong className="text-white">ErizonAI</strong>, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">2. O serviço</h2>
            <p>
              A ErizonAI é uma plataforma SaaS de inteligência artificial para análise e otimização de campanhas de tráfego pago no Meta Ads. O serviço inclui análise de campanhas, alertas automáticos, recomendações de IA, relatórios e ferramentas de gestão multi-cliente.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">3. Cadastro e conta</h2>
            <ul className="space-y-2">
              {[
                "Você deve ter pelo menos 18 anos para usar a plataforma",
                "É responsável por manter a confidencialidade da sua senha",
                "Deve fornecer informações verdadeiras no cadastro",
                "É responsável por todas as atividades realizadas na sua conta",
                "Deve nos notificar imediatamente sobre qualquer uso não autorizado",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">4. Uso aceitável</h2>
            <p className="mb-4">Você concorda em usar a plataforma apenas para fins legítimos de gestão de campanhas publicitárias. É proibido:</p>
            <ul className="space-y-2">
              {[
                "Usar a plataforma para fins ilegais ou fraudulentos",
                "Tentar acessar dados de outros usuários",
                "Realizar engenharia reversa ou copiar o código da plataforma",
                "Usar a plataforma para enviar spam ou conteúdo prejudicial",
                "Sobrecarregar intencionalmente os servidores da plataforma",
                "Compartilhar credenciais de acesso com terceiros não autorizados",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400/70 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">5. Integração com Meta Ads</h2>
            <p>
              Para usar as funcionalidades de análise de campanhas, você precisa fornecer um Access Token da Meta. Ao fazer isso, você:
            </p>
            <ul className="space-y-2 mt-3">
              {[
                "Confirma que tem autorização para acessar as contas de anúncios conectadas",
                "É responsável pelo uso adequado das permissões concedidas",
                "Entende que a ErizonAI acessa dados de campanhas apenas para fornecer o serviço contratado",
                "Concorda em cumprir os Termos de Serviço da Meta Platforms",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">6. Pagamentos e assinaturas</h2>
            <ul className="space-y-2">
              {[
                "Os planos são cobrados mensalmente ou anualmente conforme escolhido",
                "O período de teste gratuito de 7 dias não requer cartão de crédito",
                "Após o período de teste, a assinatura é cobrada automaticamente",
                "Cancelamentos podem ser feitos a qualquer momento pelo painel",
                "Não há reembolso proporcional por período não utilizado, exceto nos casos previstos no CDC",
                "Em caso de inadimplência, o acesso é suspenso após 3 dias",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">7. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo da plataforma — incluindo código, design, algoritmos, textos e marca — é de propriedade exclusiva da ErizonAI e protegido por lei. É proibida qualquer reprodução, distribuição ou criação de obras derivadas sem autorização expressa.
            </p>
            <p className="mt-3">
              Os dados das suas campanhas pertencem a você. A ErizonAI não reivindica propriedade sobre os dados que você insere na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">8. Limitação de responsabilidade</h2>
            <p>
              A ErizonAI fornece análises e recomendações com base em dados históricos e algoritmos de IA. No entanto:
            </p>
            <ul className="space-y-2 mt-3">
              {[
                "As recomendações são sugestões — a decisão final é sempre do usuário",
                "Não garantimos resultados específicos de performance de campanhas",
                "Não somos responsáveis por perdas decorrentes de decisões tomadas com base nas recomendações da plataforma",
                "Nossa responsabilidade total é limitada ao valor pago pelo serviço nos últimos 3 meses",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400/70 shrink-0 mt-1">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">9. Disponibilidade do serviço</h2>
            <p>
              Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência. Não somos responsáveis por indisponibilidades causadas por terceiros (Meta API, Supabase, Vercel, Stripe).
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">10. Cancelamento e encerramento</h2>
            <p>
              Você pode cancelar sua conta a qualquer momento pelo painel de configurações. A ErizonAI pode encerrar contas que violem estes termos, com ou sem aviso prévio. Após o cancelamento, seus dados são mantidos por 90 dias antes da exclusão definitiva.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">11. Lei aplicável</h2>
            <p>
              Estes termos são regidos pelas leis brasileiras. Quaisquer disputas serão resolvidas no foro da Comarca de São Paulo/SP, com renúncia expressa a qualquer outro.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-3">12. Contato</h2>
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1">
              <p><strong className="text-white">ErizonAI</strong></p>
              <p>E-mail: <strong className="text-purple-400">contato@erizon.com.br</strong></p>
              <p>Site: <strong className="text-purple-400">erizon.vercel.app</strong></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}