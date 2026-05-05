import { AppRouter } from "./routes/AppRouter";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { NotificationProvider } from "./shared/components/NotificationProvider";
import { FilterProvider } from "./shared/context/FilterContext";

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <FilterProvider>
          <AppRouter />
        </FilterProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
