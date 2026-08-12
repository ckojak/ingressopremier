 import { useState, useEffect, useRef } from "react";
 import { Skeleton } from "@/components/ui/skeleton";
 import { cn } from "@/lib/utils";
 
 interface LazyImageProps {
   src: string;
   alt: string;
   className?: string;
   fallback?: React.ReactNode;
   aspectRatio?: string;
 }
 
 const LazyImage = ({
   src,
   alt,
   className,
   fallback,
   aspectRatio = "aspect-video",
 }: LazyImageProps) => {
   const [isLoaded, setIsLoaded] = useState(false);
   const [isInView, setIsInView] = useState(false);
   const [hasError, setHasError] = useState(false);
   const imgRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     const observer = new IntersectionObserver(
       ([entry]) => {
         if (entry.isIntersecting) {
           setIsInView(true);
           observer.disconnect();
         }
       },
       { rootMargin: "100px" }
     );
 
     if (imgRef.current) {
       observer.observe(imgRef.current);
     }
 
     return () => observer.disconnect();
   }, []);
 
   if (hasError && fallback) {
     return <>{fallback}</>;
   }
 
   return (
     <div ref={imgRef} className={cn("relative overflow-hidden", aspectRatio, className)}>
       {/* Skeleton placeholder */}
       {!isLoaded && (
         <Skeleton className="absolute inset-0 w-full h-full" />
       )}
       
       {/* Actual image - only load when in view */}
       {isInView && (
         <img
           src={src}
           alt={alt}
           loading="lazy"
           onLoad={() => setIsLoaded(true)}
           onError={() => setHasError(true)}
           className={cn(
             "w-full h-full object-cover transition-opacity duration-300",
             isLoaded ? "opacity-100" : "opacity-0"
           )}
         />
       )}
     </div>
   );
 };
 
 export default LazyImage;