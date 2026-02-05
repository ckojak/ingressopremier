 import { Card, CardContent } from "@/components/ui/card";
 import { Skeleton } from "@/components/ui/skeleton";
 
 const EventCardSkeleton = () => {
   return (
     <Card className="overflow-hidden border-border/20">
       <div className="relative aspect-[16/10] overflow-hidden">
         <Skeleton className="w-full h-full" />
       </div>
       <CardContent className="p-5 space-y-4">
         <Skeleton className="h-6 w-3/4" />
         <div className="space-y-2">
           <div className="flex items-center gap-2">
             <Skeleton className="w-8 h-8 rounded-lg" />
             <Skeleton className="h-4 w-32" />
           </div>
           <div className="flex items-center gap-2">
             <Skeleton className="w-8 h-8 rounded-lg" />
             <Skeleton className="h-4 w-24" />
           </div>
         </div>
         <div className="flex items-center justify-between pt-4 border-t border-border/40">
           <div className="space-y-1">
             <Skeleton className="h-3 w-16" />
             <Skeleton className="h-6 w-20" />
           </div>
           <Skeleton className="w-10 h-10 rounded-full" />
         </div>
       </CardContent>
     </Card>
   );
 };
 
 export default EventCardSkeleton;