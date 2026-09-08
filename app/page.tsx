import { redirect } from "next/navigation";
import { weddingEvent } from "@/lib/event-data";

export default function Home() {
  redirect(`/${weddingEvent.slug}`);
}
