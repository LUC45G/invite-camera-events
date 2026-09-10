import { getEventBySlug } from "@/lib/upload-db";
import { notFound } from "next/navigation";
import { LiveSlideshow } from "@/components/LiveSlideshow";

export const dynamic = "force-dynamic";

type Props = PageProps<"/[slug]/live">;

export default async function LivePage({ params }: Props) {
  const { slug } = await params;

  const event = await getEventBySlug(slug);
  if (!event) return notFound();

  return (
    <LiveSlideshow
      slug={slug}
      interval={event.slideshow_interval}
      projectionEnabled={event.projection_enabled}
    />
  );
}
