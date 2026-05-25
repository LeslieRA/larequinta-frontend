import { Routes, Route } from 'react-router-dom'
import RequireAuth             from './components/RequireAuth.jsx'
import LoginPage               from './pages/admin/LoginPage.jsx'
import AdminLayout             from './pages/admin/AdminLayout.jsx'
import DashboardPage           from './pages/admin/DashboardPage.jsx'
import ClientesPage            from './pages/admin/ClientesPage.jsx'
import ZonasPage               from './pages/admin/ZonasPage.jsx'
import CategoriasPage          from './pages/admin/CategoriasPage.jsx'
import MenuPage                from './pages/admin/MenuPage.jsx'
import PaquetesPage            from './pages/admin/PaquetesPage.jsx'
import ServiciosPage           from './pages/admin/ServiciosPage.jsx'
import CategoriaInsumoPage     from './pages/admin/CategoriaInsumoPage.jsx'
import InsumosPage             from './pages/admin/InsumosPage.jsx'
import ReservacionesPage       from './pages/admin/ReservacionesPage.jsx'
import FechasBloqueadasPage    from './pages/admin/FechasBloqueadasPage.jsx'
import ConfiguracionPage       from './pages/admin/ConfiguracionPage.jsx'
import ClientePage             from './pages/cliente/ClientePage.jsx'
import ReservaPage             from './pages/cliente/ReservaPage.jsx'
import ProductosInventarioPage from './pages/admin/ProductosInventarioPage.jsx'
import MeseroPedidoPage        from './pages/mesero/MeseroPedidoPage.jsx'
import CajeroPedidoPage        from './pages/cajero/CajeroPedidoPage.jsx'
import RangosPage              from './pages/admin/RangosPage.jsx'

function App() {
  return (
    <Routes>
      {/* ── Páginas completamente públicas ── */}
      <Route path="/"         element={<ClientePage />} />
      <Route path="/reservar" element={<ReservaPage />} />
      <Route path="/login"    element={<LoginPage />} />

      {/* ── Rutas protegidas (requieren JWT) ── */}
      <Route element={<RequireAuth />}>

        {/* Panel de administración */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index                       element={<DashboardPage />} />
          <Route path="clientes"             element={<ClientesPage />} />
          <Route path="zonas"                element={<ZonasPage />} />
          <Route path="categorias"           element={<CategoriasPage />} />
          <Route path="menu"                 element={<MenuPage />} />
          <Route path="paquetes"             element={<PaquetesPage />} />
          <Route path="servicios"            element={<ServiciosPage />} />
          <Route path="cat-insumos"          element={<CategoriaInsumoPage />} />
          <Route path="insumos"              element={<InsumosPage />} />
          <Route path="reservaciones"        element={<ReservacionesPage />} />
          <Route path="fechas-bloqueadas"    element={<FechasBloqueadasPage />} />
          <Route path="configuracion"        element={<ConfiguracionPage />} />
          <Route path="inventario/productos" element={<ProductosInventarioPage />} />
          <Route path="rangos"               element={<RangosPage />} />
        </Route>

        {/* Vistas de personal — protegidas pero fuera del layout admin */}
        <Route path="/mesero" element={<MeseroPedidoPage />} />
        <Route path="/cajero" element={<CajeroPedidoPage />} />

      </Route>
    </Routes>
  )
}

export default App