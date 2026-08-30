'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, type Query, type DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';

export interface UseFirestoreCollectionResult<T> {
  data: T[];
  loading: boolean;
}





export function useFirestoreCollection<T>(
  collectionName: string,
  orderByField?: string,
): UseFirestoreCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collectionRef = collection(db, collectionName);
    const q: Query<DocumentData> = orderByField
      ? query(collectionRef, orderBy(orderByField))
      : query(collectionRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => doc.data() as T));
        setLoading(false);
      },
      (error) => {
        console.error(`[useFirestoreCollection] "${collectionName}" listener error:`, error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [collectionName, orderByField]);

  return { data, loading };
}
