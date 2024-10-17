import { HashRouter, Routes, Route } from "react-router-dom";
import { WelcomePage } from "./pages/welcome";
import { DepositPage } from "./pages/deposit";
import { Layout } from "./components/layout";
import { TransferPage } from "./pages/transfer";
import { WithdrawPage } from "./pages/withdraw";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<WelcomePage />} />
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="/transfer" element={<TransferPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
