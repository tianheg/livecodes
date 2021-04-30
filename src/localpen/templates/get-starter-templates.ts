import { getLanguageByAlias } from '../languages';
import { Pen, Template } from '../models';
import { getAbsoluteUrl } from '../utils';

const mapBaseUrl = (content: string, baseUrl: string) =>
  content.replace(/{{ __localpen_baseUrl__ }}/g, getAbsoluteUrl(baseUrl));

const loadTemplates = async (config: Pen): Promise<Template[]> =>
  (await import(config.baseUrl + 'templates.js')).starterTemplates;

/**
 * get starter templates with languages that are enabled in the current config
 */
export const getStarterTemplates = async (config: Pen) =>
  (await loadTemplates(config))
    .filter((template) => {
      const enabledLanguages = config.languages?.map(getLanguageByAlias).filter(Boolean);
      if (!enabledLanguages) return true;
      if (template.title === 'Blank Project') return true;

      const templateLanguages = [
        template.markup.language,
        template.style.language,
        template.script.language,
      ];
      for (const language of templateLanguages) {
        const lang = getLanguageByAlias(language);
        if (!lang || !enabledLanguages.includes(lang)) return false;
      }
      return true;
    })
    .map((template) => ({
      ...template,
      markup: {
        ...template.markup,
        content: mapBaseUrl(template.markup.content || '', config.baseUrl),
      },
      style: {
        ...template.style,
        content: mapBaseUrl(template.style.content || '', config.baseUrl),
      },
      script: {
        ...template.script,
        content: mapBaseUrl(template.script.content || '', config.baseUrl),
      },
      modules: template.modules.map((module) => ({
        ...module,
        url: mapBaseUrl(module.url || '', config.baseUrl),
        typesUrl: mapBaseUrl(module.typesUrl || '', config.baseUrl),
      })),
    }));
