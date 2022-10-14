import type { NextPage } from 'next'
import {useState} from 'react'
import useSWR from 'swr'
import Table from '../components/table'
import { fetcher } from '../utils/utils'

//http://localhost:3000/api/Orders?select=OrderId,ShippedDate:$substr(ShippedDate,%270%27,%2711%27),ShipName,ShipCity,ShipCountry,details:Order%20Details(ProductId,UnitPrice,Quantity)&limit=5
const limit = 20
const title = 'Orders'
const idColumn = 'OrderID'
const avatarColumn = undefined //'ContactName'
const columns = [
    { name: 'OrderID', header: 'Id' },
    { name: 'TotalProductsPrice', header: 'Total Price', fn: (row:any) => '$' + row.details.reduce((acc:number, cur:any) => acc + cur.UnitPrice * cur.Quantity, 0).toFixed(2) },
    { name: 'TotalProducts', header: 'Products', fn: (row:any) => row.details.length },
    { name: 'TotalProductsItems', header: 'Quantity', fn: (row:any) => row.details.reduce((acc:number, cur:any) => acc + cur.Quantity, 0) },
    { name: 'ShippedDate', header: 'Shipped' },
    { name: 'ShipName', header: 'Ship Name' },
    { name: 'ShipCity', header: 'City' },
    { name: 'ShipCountry', header: 'Country' },
]
const Orders: NextPage = () => {
    const [page, setPage] = useState(1)
    const offset = (page - 1) * limit
    const options = {headers: {'Prefer': 'count=exact'}}
    const { data, error } = useSWR<any>([`/api/Orders?select=OrderID,ShippedDate:$substr(ShippedDate,'0','11'),ShipName,ShipCity,ShipCountry,details:Order Details(ProductId,UnitPrice,Quantity)&limit=${limit}&offset=${offset}`, options], fetcher)
    const { first, last, total, rows } = data || {}

    return (
        <div className="px-4 sm:px-6 lg:px-8 mt-5">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    {error && <div>Failed to load</div>}
                    {!data && <div>Loading...</div>}
                </div>
            </div>
            {!error && data &&
                <div className="-mx-4 mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:-mx-6 md:mx-0 md:rounded-lg">
                    <Table
                        idColumn={idColumn}
                        avatarColumn={avatarColumn}
                        columns={columns}
                        rows={rows}
                        limit={limit}
                        first={first}
                        last={last}
                        total={total}
                        setPage={setPage}
                    />
                </div>
            }
        </div>
    )
}
export default Orders