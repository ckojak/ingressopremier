import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useSiteContext } from "./useSiteContext";

type Event = Tables<"events">;

export interface EventWithPrice extends Event {
  min_price?: number;
  total_available?: number;
}

// Query keys for events
export const eventKeys = {
  all: ["events"] as const,
  public: () => [...eventKeys.all, "public"] as const,
  admin: () => [...eventKeys.all, "admin"] as const,
  ticketTypes: () => ["ticket_types"] as const,
};

// Hook to fetch public events (published, future dates)
export function usePublicEvents() {
  const { getVisibleSiteIds } = useSiteContext();

  return useQuery({
    queryKey: eventKeys.public(),
    queryFn: async (): Promise<EventWithPrice[]> => {
      const visibleSiteIds = getVisibleSiteIds();

      // Fetch published events
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true });

      if (error) throw error;

      // Filter by visible site_ids
      const filteredData = (data || []).filter((event: any) =>
        visibleSiteIds.includes(event.site_id) || !event.site_id
      );

      // Fetch ticket prices and availability
      if (filteredData.length > 0) {
        const eventIds = filteredData.map((e) => e.id);
        const { data: ticketData } = await supabase
          .from("ticket_types")
          .select("event_id, price, quantity_available, quantity_sold")
          .in("event_id", eventIds)
          .eq("is_active", true);

        const priceAndAvailabilityByEvent: Record<
          string,
          { minPrice: number; totalAvailable: number }
        > = {};
        
        ticketData?.forEach((ticket) => {
          const price = Number(ticket.price);
          const available = ticket.quantity_available - (ticket.quantity_sold || 0);
          if (!priceAndAvailabilityByEvent[ticket.event_id]) {
            priceAndAvailabilityByEvent[ticket.event_id] = {
              minPrice: price,
              totalAvailable: available,
            };
          } else {
            if (price < priceAndAvailabilityByEvent[ticket.event_id].minPrice) {
              priceAndAvailabilityByEvent[ticket.event_id].minPrice = price;
            }
            priceAndAvailabilityByEvent[ticket.event_id].totalAvailable += available;
          }
        });

        return filteredData.map((event) => ({
          ...event,
          min_price: priceAndAvailabilityByEvent[event.id]?.minPrice,
          total_available: priceAndAvailabilityByEvent[event.id]?.totalAvailable ?? 0,
        }));
      }

      return [];
    },
    staleTime: 30 * 1000, // 30 seconds - shorter for faster updates
    refetchOnWindowFocus: true,
  });
}

// Hook to invalidate events cache - use after mutations
export function useInvalidateEvents() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
    invalidatePublic: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.public() });
    },
    invalidateAdmin: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.admin() });
    },
    invalidateTicketTypes: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.ticketTypes() });
    },
  };
}
