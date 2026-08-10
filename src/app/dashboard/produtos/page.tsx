import { getProducts } from "@/lib/data";
import { ProdutosClient } from "@/components/dashboard/produtos-client";

export const revalidate = 30;

export default async function ProdutosPage() {
  const products = await getProducts();
  return <ProdutosClient products={products} />;
}
