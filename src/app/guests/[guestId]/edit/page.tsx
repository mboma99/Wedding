import { redirect } from "next/navigation";

type EditGuestPageProps = {
  params: Promise<{
    guestId: string;
  }>;
};

export default async function EditGuestPage({ params }: EditGuestPageProps) {
  const { guestId } = await params;
  redirect(`/admin/guests/${guestId}/edit`);
}
