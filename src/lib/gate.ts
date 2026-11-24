import "server-only";
import { notFound } from "next/navigation";
import { isFeatureOn } from "./api";

export async function gate(feature: string) {
  if (!(await isFeatureOn(feature))) notFound();
}
