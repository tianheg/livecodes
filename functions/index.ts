/// <reference path="../node_modules/@cloudflare/workers-types/index.d.ts" />

type Env = Record<'API_TOKEN', string>;
type Data = Record<string, unknown>;
type PgFunction = PagesFunction<Env, 'id', Data>;
type Context = EventContext<Env, 'id', Data>;

export const onRequest: PgFunction = async function (context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // oEmbed
  const oembedUrl = encodeURIComponent(url.href);
  const originalResponse = await env.ASSETS.fetch(request);
  const modifiedBody = (await originalResponse.text()).replace(
    'href="https://api.livecodes.io/oembed?url=https%3A%2F%2Flivecodes.io&format=json"',
    `href="https://api.livecodes.io/oembed?url=${oembedUrl}&format=json"`,
  );
  const response = new Response(modifiedBody, originalResponse);
  const linkHeader = `<https://api.livecodes.io/oembed?url=${oembedUrl}&format=json>; rel="alternate"; type="application/json+oembed"; title="LiveCodes oEmbed"`;
  response.headers.append('Link', linkHeader);

  // server-side analytics
  const cf = (request as any).cf;
  context.data = {
    url: request.url,
    resource: 'app',
    method: request.method,
    date: String(new Date()),

    colo: cf?.colo,
    country: cf?.country,
    httpProtocol: cf?.httpProtocol,
    city: cf?.city,
    continent: cf?.continent,
    region: cf?.region,
    regionCode: cf?.regionCode,
    timezone: cf?.timezone,

    accept: request.headers.get('accept'),
    'accept-encoding': request.headers.get('accept-encoding'),
    'accept-language': request.headers.get('accept-language'),
    referer: request.headers.get('referer'),
    'sec-ch-ua': request.headers.get('sec-ch-ua'),
    'sec-ch-ua-mobile': request.headers.get('sec-ch-ua-mobile'),
    'sec-ch-ua-platform': request.headers.get('sec-ch-ua-platform'),
    'sec-fetch-dest': request.headers.get('sec-fetch-dest'),
    'sec-fetch-mode': request.headers.get('sec-fetch-mode'),
    'sec-fetch-site': request.headers.get('sec-fetch-site'),
    'user-agent': request.headers.get('user-agent'),

    ok: response.ok,
    'content-encoding': response.headers.get('content-encoding'),
    'content-type': response.headers.get('content-type'),
    status: response.status,
    statusText: response.statusText,
  };

  context.waitUntil(logToAPI(context));

  return response;
};

const logToAPI = (context: Context) => {
  const { data, env } = context;
  return fetch('https://api2.livecodes.io/log', {
    method: 'POST',
    headers: {
      'API-Token': env.API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'analytics',
      data,
    }),
  });
};