import type { NextPage } from 'next'
import {useState} from 'react'
import useSWR from 'swr'
import Table from '../components/table'
import { fetcher } from '../utils/utils'

const limit = 20
const title = 'Employees'
const idColumn = 'EmployeeID'
const avatarColumn = 'Name'
const columns = [
    { name: 'Name', header: 'Name' },
    { name: 'Title', header: 'Title' },
    { name: 'Address', header: 'Address' },
    { name: 'City', header: 'City' },
    { name: 'Country', header: 'Country' },
]
const Employees: NextPage = () => {
    const [page, setPage] = useState(1)
    const offset = (page - 1) * limit
    const options = {headers: {'Prefer': 'count=exact'}}
    const { data, error } = useSWR<any>([`/api/Employees?select=Name:$printf('%s %s', FirstName, LastName),Title,Address,City,Country&limit=${limit}&offset=${offset}`, options], fetcher)
    const { first, last, total, rows } = data || {}

    return (
        <div className="px-4 sm:px-6 lg:px-8 mt-5">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    {error && <div>Failed to load "{error.toString()}"</div>}
                    {!error && !data && <div>Loading...</div>}
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
export default Employees