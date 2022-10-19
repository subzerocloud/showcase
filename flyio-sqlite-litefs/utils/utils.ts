import type { NextApiRequest } from 'next'
import type { Readable } from 'stream'

interface FetcherResult {
    status: number
    first: number
    last: number
    total: number
    rows: any
}

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

function parseRangeHeader(header: string) {
    console.log(header)
    const parts = header.split('/')
    const total = parseInt(parts[1], 10) ||  0
    const range = parts[0].split('-')
    const first = parseInt(range[0], 10) || 0
    const last = parseInt(range[1], 10) || 0
    return { first, last, total }
}

async function buffer(readable: Readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}
// convert from NextApiRequest to Fetch Request
export async function convertRequest(req: NextApiRequest): Promise<Request>{
    const url = `http://${req.headers.host}${req.url}`
    const { method, headers: hdrs } = req
    const body = method === 'GET' ? undefined : (await buffer(req)).toString('utf8');
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value == 'string') {
            headers.append(key, value as string)
        }
        else if (value instanceof Array ) { 
            for (const v of value) {
                headers.append(key, v)
            }
        }
    }
    return new Request(url, {headers,method,body})
}

// helper function to format the value of the content-range header (ex: 0-9/100)
export function content_range_header(lower: number, upper: number, total?: number): string {
    const range_string = (total != 0 && lower <= upper) ? `${lower}-${upper}` : '*'
    return total ? `${range_string}/${total}` : `${range_string}/*`
}
