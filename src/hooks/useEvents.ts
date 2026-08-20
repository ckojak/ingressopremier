import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useSiteContext } from "./useSiteContext";

type Event = Tables<"events">;

export interface EventWithPrice extends Event {
  min_price?: number;
  total_available?: number;
  total_sold?: number;
}

export const eventKeys = {
  all: ["events"] as const,
  public: () => [...eventKeys.all, "public"] as const,
  admin: () => [...eventKeys.all, "admin"] as const,
  ticketTypes: () => ["ticket_types"] as const,
};

export function usePublicEvents() {
  const { getVisibleSiteIds } = useSiteContext();

  return useQuery({
    queryKey: eventKeys.public(),
    queryFn: async (): Promise<EventWithPrice[]> => {
      const visibleSiteIds = getVisibleSiteIds();

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true });

      if (error) throw error;

      const filteredData = (data || []).filter((event: any) =>
        visibleSiteIds.includes(event.site_id) || !event.site_id
      );

      if (filteredData.length > 0) {
        const eventIds = filteredData.map((e) => e.id);
        const { data: ticketData } = await supabase
          .from("ticket_types")
          .select("event_id, price, quantity_available, quantity_sold")
          .in("event_id", eventIds)
          .eq("is_active", true);

        const statsByEvent: Record<
          string,
          { minPrice: number; totalAvailable: number; totalSold: number }
        > = {};

        ticketData?.forEach((ticket) => {
          const price = Number(ticket.price);
          const sold = ticket.quantity_sold || 0;
          const available = ticket.quantity_available - sold;
          if (!statsByEvent[ticket.event_id]) {
            statsByEvent[ticket.event_id] = {
              minPrice: price,
              totalAvailable: available,
              totalSold: sold,
            };
          } else {
            if (price < statsByEvent[ticket.event_id].minPrice) {
              statsByEvent[ticket.event_id].minPrice = price;
            }
            statsByEvent[ticket.event_id].totalAvailable += available;
            statsByEvent[ticket.event_id].totalSold += sold;
          }
        });

        return filteredData.map((event) => ({
          ...event,
          min_price: statsByEvent[event.id]?.minPrice,
          total_available: statsByEvent[event.id]?.totalAvailable ?? 0,
          total_sold: statsByEvent[event.id]?.totalSold ?? 0,
        }));
      }

      return [];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

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
