import { redirect } from "next/navigation";

export default function NewGuestPage() {
  redirect("/admin/guests/new");
}
