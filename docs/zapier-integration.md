# Erizon × Zapier — Guia de Integração

Conecte qualquer ferramenta à Erizon usando o endpoint universal de eventos.

## Configuração

### 1. Obtenha seu token de API
Acesse **Configurações → Integrações** no Erizon e copie seu token de API.

### 2. Configure um Zap no Zapier

**Trigger:** qualquer evento da plataforma que você quer conectar (ex: "Nova venda no Hotmart")

**Action:** escolha **Webhooks by Zapier → POST**

Configure assim:

| Campo | Valor |
|---|---|
| URL | `https://erizonai.com.br/api/events` |
| Payload Type | `JSON` |
| Headers | `Authorization: Bearer SEU_TOKEN_AQUI` |

### 3. Body do request

```json
{
  "event": "purchase",
  "value": "{{price}}",
  "currency": "BRL",
  "customer_email": "{{customer_email}}",
  "campaign": "{{utm_campaign}}",
  "source": "hotmart"
}
```

## Eventos suportados

| event | Quando usar |
|---|---|
| `purchase` | Compra finalizada |
| `abandoned_cart` | Carrinho abandonado |
| `checkout_iniciado` | Checkout começou |
| `refund` | Reembolso |
| `lead` | Lead gerado |
| `registration` | Cadastro completo |
| `appointment` | Agendamento |
| `subscription` | Nova assinatura |
| `subscription_cancel` | Cancelamento |
| `contact` | Contato direto |
| `custom` | Evento personalizado |

## Exemplos por plataforma

### Hotmart
- Trigger: **Hotmart → New Sale**
- event: `purchase`, value: `{{commission.value}}`, source: `hotmart`

### ActiveCampaign
- Trigger: **ActiveCampaign → New Deal**
- event: `lead`, customer_email: `{{contact.email}}`, source: `activecampaign`

### Calendly
- Trigger: **Calendly → New Event**
- event: `appointment`, customer_email: `{{invitee.email}}`, source: `calendly`

### Google Sheets (manual)
- Trigger: **Google Sheets → New Row**
- event: `custom`, value: `{{column_valor}}`, source: `planilha`
