import { redirect } from "next/navigation";

// Keep old bookmarks useful after removing the manual intake flow.
export default function OldOnlineLeadsPage() {
  redirect("/authority/issues");
}
