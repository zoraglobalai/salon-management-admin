import { AppRouter } from "./routes/AppRouter";
import { ThemeProvider } from "./shared/theme/ThemeProvider";

function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
