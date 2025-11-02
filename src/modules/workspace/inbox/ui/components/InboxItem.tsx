import Image from "next/image";
import { BadgeCheck } from "lucide-react";
// import { ChevronRightIcon } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ConversationDto } from "@/modules/conversations/domain/conversation";

export function InboxItemSkeleton() {
    return (
        <div className="flex gap-3 w-full p-2 rounded-md cursor-pointer">
            <div className="size-16 self-center">
                <Skeleton className="rounded-xl size-12 object-cover outline-background outline-2" />
            </div>
            <div className="w-full flex flex-col gap-2">
                <div className="flex gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-4 w-full" />
            </div>
        </div>
    )
}

export default function InboxItem({ data }: { data: ConversationDto}) {
    const { contact, last_message } = data;

    const formattedTime = new Date(last_message?.created_at ?? "").toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Bogota",
    });

    return (
        <div className="flex gap-3 w-full p-2 hover:bg-accent rounded-md cursor-pointer">
            <div className="relative size-16 self-center">
                <Image
                    width={1080}
                    height={1080}
                    alt={contact.name}
                    src={contact.profile_pic_url}
                    className="rounded-xl size-12 object-cover outline-background outline-2"
                />
                {
                    data.assigned_agent && (
                        <Image 
                            width={1080}
                            height={1080}
                            alt={data.assigned_agent.name}
                            src={data.assigned_agent.avatar}
                            className="pt-0.5 rounded-lg size-8 object-cover absolute bottom-2 -right-1 bg-gradient-to-tl from-blue-200 to-blue-500 outline-background outline-2"
                        />
                    )
                }
            </div>
            <div className="w-full">
                <div className="flex">
                    <h1 className="text-sm font-bold">{contact.name}</h1>
                    <time className="ml-auto text-xs text-muted-foreground">{formattedTime}</time>
                </div>
                <div className="flex">
                    <p className="text-sm text-muted-foreground line-clamp-1">{last_message?.message ?? ""}</p>
                    <Badge variant="secondary" className="ml-auto font-mono">01</Badge>
                </div>
                <div className="flex mt-1">
                    <Badge 
                        variant="info"
                        className="bg-blue-500 text-white"
                    >
                        <BadgeCheck/>
                        Nuevo {contact.type}
                    </Badge>
                </div>
            </div>
        </div>
    )
}

{/* <div className="relative size-16 self-center">
<Image
    alt={name}
    src={avatar}
    width={1080}
    height={1080}
    className="rounded-full size-[50px] object-cover"
/>
<div className="absolute bottom-2 right-0 rounded-full bg-green-500 outline-white outline-2 p-0.5">
    <AiOutlineWhatsApp className="size-4 text-white" />
</div>
</div> */}