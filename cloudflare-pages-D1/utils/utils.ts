interface FetcherResult {
    status: number
    first: number
    last: number
    total: number
    rows: any
}
export async function fetcher(url: string, options ?: any):Promise<FetcherResult> {
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

// helper function to format the value of the content-range header (ex: 0-9/100)
export function content_range_header(lower: number, upper: number, total?: number): string {
    const range_string = (total != 0 && lower <= upper) ? `${lower}-${upper}` : '*'
    return total ? `${range_string}/${total}` : `${range_string}/*`
}