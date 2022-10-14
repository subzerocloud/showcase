import Link from 'next/link';
// import Image from 'next/image'
//import { useRouter } from 'next/router';

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Menu, Transition } from '@headlessui/react'
import {
  ArchiveBoxIcon, //supliers
  ShoppingCartIcon, // orders
  IdentificationIcon, //employees
  MagnifyingGlassIcon, //search
  RectangleGroupIcon, //dashboard
  CubeIcon, //products
  //CalendarIcon,
  //ChartBarIcon,
  //FolderIcon,
  HomeIcon,
  //InboxIcon,
  UsersIcon,
//  XMarkIcon,
} from '@heroicons/react/24/outline'
// import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
type DashboardLayoutProps = {
    children: React.ReactNode,
};

const general = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Dashboard', href: '/dash', icon: RectangleGroupIcon },
  // { name: 'Projects', href: '#', icon: FolderIcon },
  // { name: 'Calendar', href: '#', icon: CalendarIcon },
  // { name: 'Documents', href: '#', icon: InboxIcon },
  // { name: 'Reports', href: '#', icon: ChartBarIcon },
]

const backoffice = [
  { name: 'Suppliers', href: '/suppliers', icon: ArchiveBoxIcon },
  { name: 'Products', href: '/products', icon: CubeIcon },
  { name: 'Orders', href: '/orders', icon: ShoppingCartIcon },
  { name: 'Employees', href: '/employees', icon: IdentificationIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Search', href: '/search', icon: MagnifyingGlassIcon },
]

// const userNavigation = [
//   { name: 'Your Profile', href: '#' },
//   { name: 'Settings', href: '#' },
//   { name: 'Sign out', href: '#' },
// ]

function classNames(...classes:string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Layout({ children }: DashboardLayoutProps) {
  const [activeMenuItem, setActiveMenuItem] = useState('/')
  useEffect(() => setActiveMenuItem(window.location.pathname), [])
  return (
    <>
      <div>
        {/* Static sidebar for desktop */}
        <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-gray-800">
            <div className="flex h-16 flex-shrink-0 items-center bg-gray-900 px-4 text-white">
              <b>Northwind</b>&nbsp;Traders
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className='text-gray-300 text-xs pl-5 pt-5 uppercase'>General</div>
              <nav className="space-y-1 px-2 py-4">
                {general.map((item) => (
                  <Link href={item.href} key={item.name}>
                    <a
                    onClick={() => setActiveMenuItem(item.href)}
                    className={classNames(
                      item.href === activeMenuItem ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                    )}
                  >
                    <item.icon
                      className={classNames(
                        item.href === activeMenuItem ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300',
                        'mr-3 flex-shrink-0 h-6 w-6'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                    </a>
                  </Link>
                ))}
              </nav>

              <div className='text-gray-300 text-xs pl-5 pt-5 uppercase'>Backoffice</div>
              <nav className="flex-1 space-y-1 px-2 py-4">
                {backoffice.map((item) => (
                  <Link href={item.href} key={item.name}>
                    <a
                    onClick={() => setActiveMenuItem(item.href)}
                    className={classNames(
                      item.href === activeMenuItem ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                    )}
                  >
                    <item.icon
                      className={classNames(
                        item.href === activeMenuItem ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300',
                        'mr-3 flex-shrink-0 h-6 w-6'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                    </a>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:pl-64">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}