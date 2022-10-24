import Link from 'next/link';

import { useState, useEffect } from 'react'

type DashboardLayoutProps = {
  children: React.ReactNode,
  general: { name: string, href: string, icon: any }[],
  backoffice: { name: string, href: string, icon: any }[],
};

function classNames(...classes:string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Layout({ general, backoffice, children }: DashboardLayoutProps) {
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