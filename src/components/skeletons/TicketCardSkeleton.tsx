 import { Card, CardContent } from "@/components/ui/card";
 import { Skeleton } from "@/components/ui/skeleton";
 
 const TicketCardSkeleton = () => {
   return (
     <Card className="overflow-hidden border-border">
       <div className="flex flex-col md:flex-row">
         <Skeleton className="md:w-48 h-32 md:h-auto" />
         <CardContent className="flex-1 p-4 space-y-3">
           <div className="flex items-start justify-between">
             <div className="space-y-2">
               <Skeleton className="h-5 w-48" />
               <Skeleton className="h-4 w-24" />
             </div>
             <Skeleton className="h-5 w-16 rounded-full" />
           </div>
           <div className="space-y-2">
             <div className="flex items-center gap-2">
               <Skeleton className="w-4 h-4 rounded" />
               <Skeleton className="h-4 w-32" />
             </div>
             <div className="flex items-center gap-2">
               <Skeleton className="w-4 h-4 rounded" />
               <Skeleton className="h-4 w-24" />
             </div>
           </div>
           <Skeleton className="h-8 w-28 rounded-md" />
         </CardContent>
       </div>
     </Card>
   );
 };
 
 export default TicketCardSkeleton;