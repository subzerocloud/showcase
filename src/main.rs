#[macro_use]
extern crate lazy_static;

#[macro_use]
extern crate rocket;

use http::Method;
use snafu::OptionExt;
use figment::{
    providers::{Env, Format, Toml},
    Figment, Profile,
};
use rocket::{
    routes,
    http::{uri::Origin, CookieJar, Header, Status, ContentType as HTTPContentType},
    Build, Config as RocketConfig, Rocket, State,
};
use subzero::{
    config::VhostConfig,
    error::{GucStatusError, Error},
    frontend::postgrest,
    api::ContentType::{SingularJSON, TextCSV, ApplicationJSON},
    backend::{Backend},
};
#[cfg(feature = "postgresql")]
use subzero::backend::postgresql::PostgreSQLBackend;
#[cfg(feature = "sqlite")]
use subzero::backend::sqlite::SQLiteBackend;

mod rocket_util;
use rocket_util::{AllHeaders, ApiResponse, QueryString, RocketError};

type DbBackend = Box<dyn Backend + Send + Sync>;
lazy_static! {
    static ref SINGLE_CONTENT_TYPE: HTTPContentType = HTTPContentType::parse_flexible("application/vnd.pgrst.object+json").unwrap();
}

// main request handler
// this is mostly to align types between rocket and subzero functions
async fn handle_request(
    method: &Method, table: &String, origin: &Origin<'_>, parameters: &QueryString<'_>, body: Option<String>, cookies: &CookieJar<'_>,
    headers: AllHeaders<'_>, db_backend: &State<DbBackend>,
) -> Result<ApiResponse, RocketError> {
    let (status, content_type, headers, body) = postgrest::handle(
        table,
        method,
        origin.path().to_string(),
        parameters,
        body,
        headers.iter().map(|h| (h.name().as_str().to_string(), h.value().to_string())).collect(),
        cookies.iter().map(|c| (c.name().to_string(), c.value().to_string())).collect(),
        db_backend,
    )
    .await
    .map_err(|e| RocketError(e))?;

    let http_content_type = match content_type {
        SingularJSON => SINGLE_CONTENT_TYPE.clone(),
        TextCSV => HTTPContentType::CSV,
        ApplicationJSON => HTTPContentType::JSON,
    };

    Ok(ApiResponse {
        response: (
            Status::from_code(status).context(GucStatusError).map_err(|e| RocketError(e))?,
            (http_content_type, body),
        ),
        headers: headers.into_iter().map(|(n, v)| Header::new(n, v)).collect::<Vec<_>>(),
    })
}


// define rocket request handlers, they are just wrappers around handle_request function
// since rocket does not allow yet a single function to handle multiple verbs
#[get("/")]
fn index() -> &'static str { "Hello, world!" }

#[get("/<table>?<parameters..>")]
async fn get<'a>(
    table: String, origin: &Origin<'_>, parameters: QueryString<'a>, cookies: &CookieJar<'a>, headers: AllHeaders<'a>, db_backend: &State<DbBackend>,
) -> Result<ApiResponse, RocketError> {
    handle_request(&Method::GET, &table, origin, &parameters, None, cookies, headers, db_backend).await
}

#[post("/<table>?<parameters..>", data = "<body>")]
async fn post<'a>(
    table: String, origin: &Origin<'_>, parameters: QueryString<'a>, body: String, cookies: &CookieJar<'a>, headers: AllHeaders<'a>,
    db_backend: &State<DbBackend>,
) -> Result<ApiResponse, RocketError> {
    handle_request(&Method::POST, &table, origin, &parameters, Some(body), cookies, headers, db_backend).await
}

#[delete("/<table>?<parameters..>", data = "<body>")]
async fn delete<'a>(
    table: String, origin: &Origin<'_>, parameters: QueryString<'a>, body: String, cookies: &CookieJar<'a>, headers: AllHeaders<'a>,
    db_backend: &State<DbBackend>,
) -> Result<ApiResponse, RocketError> {
    handle_request(&Method::DELETE, &table, origin, &parameters, Some(body), cookies, headers, db_backend).await
}

#[patch("/<table>?<parameters..>", data = "<body>")]
async fn patch<'a>(
    table: String, origin: &Origin<'_>, parameters: QueryString<'a>, body: String, cookies: &CookieJar<'a>, headers: AllHeaders<'a>,
    db_backend: &State<DbBackend>,
) -> Result<ApiResponse, RocketError> {
    handle_request(&Method::PATCH, &table, origin, &parameters, Some(body), cookies, headers, db_backend).await
}

#[put("/<table>?<parameters..>", data = "<body>")]
async fn put<'a>(
    table: String, origin: &Origin<'_>, parameters: QueryString<'a>, body: String, cookies: &CookieJar<'a>, headers: AllHeaders<'a>,
    db_backend: &State<DbBackend>,
) -> Result<ApiResponse, RocketError> {
    handle_request(&Method::PUT, &table, origin, &parameters, Some(body), cookies, headers, db_backend).await
}

// main function where we read the configuration and initialize the rocket webserver
#[allow(unreachable_code)]
async fn start() -> Result<Rocket<Build>, Error> {
    #[cfg(debug_assertions)]
    let profile = RocketConfig::DEBUG_PROFILE;

    #[cfg(not(debug_assertions))]
    let profile = RocketConfig::RELEASE_PROFILE;

    // try to read the configuration from both a file and env vars
    // this configuration includes both subzero specific settings (VhostConfig type)
    // and rocket configuration
    let config = Figment::from(RocketConfig::default())
        .merge(Toml::file(Env::var_or("SUBZERO_CONFIG", "config.toml")).nested())
        .merge(Env::prefixed("SUBZERO_").split("__").ignore(&["PROFILE"]).global())
        .select(Profile::from_env_or("SUBZERO_PROFILE", profile));

    // extract the subzero specific part of the configuration
    let vhost_config: VhostConfig = config.extract().expect("config");
    #[allow(unused_variables)]
    let url_prefix = vhost_config.url_prefix.clone().unwrap_or("/".to_string());

    //initialize the backend
    #[allow(unused_variables)]
    let backend: Box<dyn Backend + Send + Sync> = match vhost_config.db_type.as_str() {
        #[cfg(feature = "postgresql")]
        "postgresql" => Box::new(PostgreSQLBackend::init("default".to_string(), vhost_config).await?),
        #[cfg(feature = "sqlite")]
        "sqlite" => Box::new(SQLiteBackend::init("default".to_string(), vhost_config).await?),
        t => panic!("unsupported database type: {}", t),
    };

    // initialize the web server
    let server = rocket::custom(config)
        .manage(backend).mount("/", routes![index])
        .mount(&url_prefix, routes![get, post, delete, patch, put])
        .mount(format!("{}/rpc", &url_prefix), routes![get, post]);

    Ok(server)
}

#[launch]
async fn rocket() -> Rocket<Build> {
    match start().await {
        Ok(r) => r,
        Err(e) => panic!("{}", e),
    }
}
