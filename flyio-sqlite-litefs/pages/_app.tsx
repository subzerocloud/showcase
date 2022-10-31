import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '../components/layout'

import {
    ArchiveBoxIcon, //supliers
    ShoppingCartIcon, // orders
    IdentificationIcon, //employees
    CubeIcon, //products
    HomeIcon,
    UsersIcon,
    RectangleGroupIcon,
} from '@heroicons/react/24/outline'

const general = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Dashboard', href: '/dash', icon: RectangleGroupIcon },
]

const backoffice = [
    { name: 'Suppliers', href: '/suppliers', icon: ArchiveBoxIcon },
    { name: 'Products', href: '/products', icon: CubeIcon },
    { name: 'Orders', href: '/orders', icon: ShoppingCartIcon },
    { name: 'Employees', href: '/employees', icon: IdentificationIcon },
    { name: 'Customers', href: '/customers', icon: UsersIcon },
   // { name: 'Search', href: '/search', icon: MagnifyingGlassIcon },
]

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <Layout general={general} backoffice={backoffice}>
            <Component {...pageProps} />
        </Layout>
    );
}

export default MyApp