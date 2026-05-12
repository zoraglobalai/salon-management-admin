import { AppRouter } from "./routes/AppRouter";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { NotificationProvider } from "./shared/components/NotificationProvider";
import { FilterProvider } from "./shared/context/FilterContext";
import { CommunicationsProvider } from "./shared/context/CommunicationsContext";

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <FilterProvider>
          <CommunicationsProvider>
            <AppRouter />
          </CommunicationsProvider>
        </FilterProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
