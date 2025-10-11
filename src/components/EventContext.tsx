import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface User {
  uid: string;
  department: string;
  current_level?: string;
}

interface EventProviderProps {
  user: User;
  children: ReactNode;
}

interface EventContextType {
  events: any[]; // Replace `any` with your actual event type if available
  errorMessage: string | null;
  fetchEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEventContext = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
};

export const EventProvider = ({ user, children }: EventProviderProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.168.1.98:5000/user/events?userId=${user.uid}&department=${user.department}&level=${user.current_level}`
      );

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setEvents(data);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error fetching events:", error);
      setErrorMessage("Error retrieving event, please retry");
    }
  }, [user.uid, user.department, user.current_level]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <EventContext.Provider value={{ events, errorMessage, fetchEvents }}>
      {children}
    </EventContext.Provider>
  );
};
