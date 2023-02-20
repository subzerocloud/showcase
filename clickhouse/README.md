## What is this?
This is a demo of [subZero library](https://www.npmjs.com/package/@subzerocloud/web) capabilities, leveraged in a Js/Typescript server, to automatically expose a PostgREST compatible backend on top of the underlying [ClickHouse](https://clickhouse.com/) database. 

## Try it out
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/clickhouse
    ```
- Install dependencies
    ```bash
    yarn install
    ```
- Build the app
    ```bash
    yarn build
    ```
- Start the db
    
    Note: The data is pulled from remote s3 bucket, so it might take a while to download it (10s-30s).
    Because of that, when you start the app, you will see `Failed to connect to database, retrying in 1 seconds...` messages. This is normal, and the app will retry to connect to the db until it succeeds.
    
    ```bash
    yarn db
    ```
- Start the app
    ```bash
    yarn start
    ```

- Try some requests (the same examples as in the [ClickHouse tutorial](https://clickhouse.com/docs/en/tutorial/), but using the PostgREST compatible API)
    - average tip amount
        ```bash
        curl -i "http://localhost:3000/trips?select=\$avg(tip_amount)"
        ```

    - average cost based on the number of passengers
        ```bash
        curl -i "http://localhost:3000/trips?select=passenger_count,average_total_amount:\$ceil(\$avg(total_amount),'2'::integer)&groupby=passenger_count"
        ```

    - daily number of pickups per neighborhood
        ```bash
        curl -i "http://localhost:3000/trips?select=pickup_date,pickup_ntaname,number_of_trips:\$sum('1'::UInt8)&groupby=pickup_date,pickup_ntaname&order=pickup_date.asc"
        ```


    - length of the trip
        ```bash
        curl -i "http://localhost:3000/trips?select=avg_tip:\$avg(tip_amount),avg_fare:\$avg(fare_amount),avg_passenger:\$avg(passenger_count),count:\$count('1'),trip_minutes:\$truncate(\$date_diff('minute'::Text,pickup_datetime,dropoff_datetime))&groupby=trip_minutes&order=trip_minutes.desc"
        ```

    - pickups in each neighborhood, broken down by hour of the day
        ```bash
        curl -i "http://localhost:3000/trips?select=pickup_ntaname,pickup_hour:\$toHour(pickup_datetime),pickups:\$sum('1'::UInt8)&pickup_ntaname=not.eq.&groupby=pickup_ntaname,pickup_hour&order=pickup_ntaname,pickup_hour"
        ```

    - use the dictGet function to retrieve a borough's name in a query
        ```bash
        curl -i "http://localhost:3000/trips?select=total:\$count('1'::UInt8),borough_name:\$dictGetOrDefault('taxi_zone_dictionary'::String,'Borough'::String,\$toUInt64(pickup_nyct2010_gid),'Unknown'::String)&or=(dropoff_nyct2010_gid.eq.132,dropoff_nyct2010_gid.eq.138)&groupby=borough_name&order=total.desc"
        ```

    - join the taxi_zone_dictionary with your trips
        ```bash
        curl -i "http://localhost:3000/trips?select=total:\$count('1'::UInt8),borough:taxi_zone_dictionary\!pickup_fkey(name:Borough)&or=(dropoff_nyct2010_gid.eq.132,dropoff_nyct2010_gid.eq.138)&groupby=pickup_nyct2010_gid&order=total.desc"
        ```