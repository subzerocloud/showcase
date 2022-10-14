/* eslint-disable @next/next/no-img-element */
import type { NextPage } from 'next'
const Home: NextPage = () => {
    return (
        <div className="px-8 mt-5">
            <div>
                <h1 className="text-xl font-semibold text-gray-900">Welcome to Northwind Traders (by subZero)</h1>
            </div>
            <div className="mx-auto py-4 text-base card-content">
                
                <h2 className='text-xl text-gray-400 mb-5'>Running on Cloudflare&apos;s Pages + D1</h2>
                <img alt='' className='float-right object-scale-down w-96' src="dbimage.webp" />
                <p className='pt-4'>This is a demo of the Northwind dataset</p>
                <ul>
                    <li className='pt-4'>Frontend is implemented in NextJS</li>
                    <li className='pt-4'>Backend is implemented in Typescript and leverages subZero as a library to automatically expose a PostgREST compatible backend on top of the underlying database</li>
                    <li className='pt-4'>Data is stored in <a href="https://blog.cloudflare.com/introducing-d1" className='link'>D1</a>, Cloudflare&apos;s SQLite compatible edge database</li>
                    <li className='pt-4'>
                        Everything is deployed to <a href="https://pages.cloudflare.com/" className='link'>Cloudflare Pages</a> which
                        hosts the frontend and also runs the backend as a single serverless function in <a href="https://developers.cloudflare.com/pages/platform/functions/" className='link'>Functions</a>
                    </li>
                </ul>
                <p className='pt-4'>This dataset was sourced from <a className='link' href="https://github.com/jpwhite3/northwind-SQLite3">northwind-SQLite3</a>.</p>

                <p className='pt-4'>You can use the UI to explore Supplies, Orders, Customers, Employees and Products, or you can use search if you know what you&apos;re looking for.</p>
                
            </div>
        </div>
    );
}
export default Home