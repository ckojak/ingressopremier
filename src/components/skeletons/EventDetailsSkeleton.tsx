 import { Card, CardContent, CardHeader } from "@/components/ui/card";
 import { Skeleton } from "@/components/ui/skeleton";
 import Header from "@/components/layout/Header";
 
 const EventDetailsSkeleton = () => {
   return (
     <div className="min-h-screen bg-background">
       <Header />
       <main className="pt-24 pb-16">
         <div className="container mx-auto px-4">
           {/* Back button skeleton */}
           <Skeleton className="h-10 w-24 mb-6 rounded-lg" />
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Main content */}
             <div className="lg:col-span-2 space-y-6">
               {/* Image skeleton */}
               <Skeleton className="w-full aspect-video rounded-2xl" />
               
               {/* Title */}
               <Skeleton className="h-10 w-3/4" />
               
               {/* Event info */}
               <div className="flex flex-wrap gap-4">
                 <div className="flex items-center gap-2">
                   <Skeleton className="w-5 h-5 rounded" />
                   <Skeleton className="h-4 w-32" />
                 </div>
                 <div className="flex items-center gap-2">
                   <Skeleton className="w-5 h-5 rounded" />
                   <Skeleton className="h-4 w-16" />
                 </div>
                 <div className="flex items-center gap-2">
                   <Skeleton className="w-5 h-5 rounded" />
                   <Skeleton className="h-4 w-24" />
                 </div>
               </div>
               
               {/* Description */}
               <div className="space-y-2">
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-5/6" />
                 <Skeleton className="h-4 w-4/6" />
               </div>
             </div>
             
             {/* Sidebar - Ticket selection */}
             <div className="space-y-6">
               <Card className="bg-card/80">
                 <CardHeader>
                   <Skeleton className="h-6 w-32" />
                 </CardHeader>
                 <CardContent className="space-y-4">
                   {/* Ticket types */}
                   {[1, 2].map((i) => (
                     <div key={i} className="p-4 border rounded-lg space-y-2">
                       <div className="flex justify-between">
                         <Skeleton className="h-5 w-24" />
                         <Skeleton className="h-5 w-20" />
                       </div>
                       <Skeleton className="h-4 w-32" />
                       <div className="flex justify-end gap-2">
                         <Skeleton className="h-8 w-8 rounded" />
                         <Skeleton className="h-8 w-8 rounded" />
                         <Skeleton className="h-8 w-8 rounded" />
                       </div>
                     </div>
                   ))}
                   
                   {/* Buttons */}
                   <div className="space-y-3 pt-4">
                     <Skeleton className="h-12 w-full rounded-lg" />
                     <Skeleton className="h-12 w-full rounded-lg" />
                     <Skeleton className="h-12 w-full rounded-lg" />
                   </div>
                 </CardContent>
               </Card>
             </div>
           </div>
         </div>
       </main>
     </div>
   );
 };
 
 export default EventDetailsSkeleton;