import { parseRangeHeader } from 'subzerocloud'
import useSWR from 'swr'
interface FetcherResult {
    status: number
    first: number
    last: number
    total: number
    rows: any
}
const apiBaseUrl = '/api'
const common_options = { headers: { 'Prefer': 'count=exact' } };

export async function fetcher(url: string, options?: any): Promise<FetcherResult> {
    return await fetch(url, options).then(async (res) => {
        const status = res.status
        const rows:any = await res.json()

        if (status >= 400) { 
            throw new Error(rows.message) 
        }
        const { first, last, total } = parseRangeHeader(res.headers.get('Content-Range') || '')
        return { status, first, last, total, rows }
    })
}

export function getSuppliers(offset: number, limit: number) {
    return useSWR<any>([`${apiBaseUrl}/Suppliers?limit=${limit}&offset=${offset}`, common_options], fetcher)
}

export function getProducts(offset: number, limit: number) {
    return useSWR<any>([`${apiBaseUrl}/Products?limit=${limit}&offset=${offset}`, common_options], fetcher)
}

export function getOrders(offset: number, limit: number) {
    const options = { headers: { 'Prefer': 'count=exact' } }
    return useSWR<any>([`${apiBaseUrl}/Orders?select=OrderID,ShippedDate:ShippedDate::date,ShipName,ShipCity,ShipCountry,details:Order Details(ProductID,UnitPrice,Quantity)&limit=${limit}&offset=${offset}`, common_options], fetcher)
}

export function getEmployees(offset: number, limit: number) {
    return useSWR<any>([`${apiBaseUrl}/Employees?select=EmployeeID,Name:$printf('%s %s', FirstName, LastName),Title,Address,City,Country&limit=${limit}&offset=${offset}`, common_options], fetcher)
}

export function getStats() {
    return useSWR<any>(`${apiBaseUrl}/stats`, fetcher)
}

export function getCustomers(offset: number, limit: number) {
    return useSWR<any>([`${apiBaseUrl}/Customers?limit=${limit}&offset=${offset}`, common_options], fetcher)
}