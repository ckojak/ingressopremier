import { useState, useEffect } from "react";

interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGECity {
  id: number;
  nome: string;
}

export function useIBGEStates() {
  const [states, setStates] = useState<IBGEState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data: IBGEState[]) => {
        setStates(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching states:", err);
        setLoading(false);
      });
  }, []);

  return { states, loading };
}

export function useIBGECities(stateUF: string) {
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stateUF) {
      setCities([]);
      return;
    }

    setLoading(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUF}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data: IBGECity[]) => {
        setCities(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setLoading(false);
      });
  }, [stateUF]);

  return { cities, loading };
}
