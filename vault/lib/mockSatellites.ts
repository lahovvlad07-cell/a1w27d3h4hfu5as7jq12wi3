/**
 * mockSatellites.ts — МОК-заглушки VPN- и AI-сателлитов.
 *
 * Это НЕ рабочая интеграция с 3X-UI / OpenAI / Anthropic / Google API.
 * Реальный реселлинг доступа к LLM API через промокоды, как правило,
 * нарушает условия использования провайдеров, а массовая выдача
 * VPN-подписок как коммерческий сервис требует отдельной юридической
 * проверки. Здесь только имитация ответа для демонстрации потока данных.
 */

export function issueMockVpnKey(rewardValue: string) {
  return {
    vlessLink: "vless://00000000-0000-0000-0000-000000000000@mock.example:443?security=reality#DEMO",
    note: `[MOCK] Условная выдача по промокоду: ${rewardValue}`,
  };
}

export function issueMockAiGrant(rewardValue: string) {
  return {
    note: `[MOCK] Условное начисление доступа: ${rewardValue}. Реальная выдача доступа к сторонним LLM API не реализована.`,
  };
}
