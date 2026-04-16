import FormularioLanding from "../../FormularioLanding";

export default async function FormularioClientePage({
  params,
}: {
  params: Promise<{ userId: string; clienteId: string }>;
}) {
  const { userId, clienteId } = await params;

  return <FormularioLanding userId={userId} clienteId={clienteId} enabled />;
}
