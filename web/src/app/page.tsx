import { ClientChatWrapper } from "./components/sections/chat/ClientChatWrapper";

// Initialize message types before rendering
import "./lib/types/init";

export default function Home() {
  return (
    <div>
      <ClientChatWrapper />
    </div>
  );
}
