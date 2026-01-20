import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navigate } from "react-router-dom";

import CalculatorPage from "@/pages/CalculatorPage";
import HomePage from "@/pages/HomePage";
import PlansPage from "@/pages/PlansPage";
import CreatePlanPage from "@/pages/CreatePlanPage";
import { EditExercisePage } from "@/pages/EditExercisePage";
import { EditMeasurementPage } from "@/pages/EditMeasurementPage.tsx";
import ExercisesPage from "@/pages/ExercisesPage.tsx";
import HistoryPage from "@/pages/HistoryPage.tsx";
import MeasurementsPage from "@/pages/MeasurementsPage.tsx";

import { SideBarMenu } from "@/components/menu/SideBarMenu";

function App() {
	// const authStore = useAuthStore();
	// const isAuthenticated = !!authStore.session;
	return (
		<BrowserRouter>
			<Routes>
				{/* Old Routes */}
				<Route path="/old/calculator" element={<CalculatorPage />} />
				<Route path="/old/history" element={<HistoryPage />} />
				<Route path="/old/exercises" element={<ExercisesPage />} />
				<Route path="/old/exercises/:id" element={<EditExercisePage />} />
				<Route path="/old/measurements" element={<MeasurementsPage />} />
				<Route path="/old/measurements/:id" element={<EditMeasurementPage />} />
				<Route path="*" element={<Navigate to="/old/calculator" replace />} />

				{/* New Routes */}
				<Route path="/" element={<HomePage />} />
				<Route path="/plans" element={<PlansPage />} />
				<Route path="/plans/create" element={<CreatePlanPage />} />
			</Routes>
			<SideBarMenu />
		</BrowserRouter>
	);
}

export default App;
