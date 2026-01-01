import { useState, useEffect } from 'react';
import type { OwnershipData } from './data';

export const useOwnershipData = () => {
  const [data, setData] = useState<OwnershipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/ownership.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch ownership data');
        }
        return response.json();
      })
      .then((json: OwnershipData[]) => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
};


