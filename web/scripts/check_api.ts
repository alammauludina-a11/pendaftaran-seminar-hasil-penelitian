import { GET } from "../src/app/api/admin/pendaftaran/route";

async function main() {
  const res = await GET();
  const data = await res.json();
  console.log("Pendaftaran API Data length:", data.pendaftaran.length);
  const ricky = data.pendaftaran.find((p: any) => p.name === "Ricky");
  console.log("Ricky in API:", JSON.stringify(ricky, null, 2));
}

main().catch(console.error);
