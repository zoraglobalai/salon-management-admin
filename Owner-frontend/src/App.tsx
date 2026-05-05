import { AppRouter } from "./routes/AppRouter";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { NotificationProvider } from "./shared/components/NotificationProvider";

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
