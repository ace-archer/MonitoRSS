import qs from 'qs';
import {
  array, InferType, object, string,
} from 'yup';
import fetchRest from '../../../utils/fetchRest';

export interface GetUserFeedArticlesInput {
  feedId: string;
  data: {
    limit: number
    random?: boolean
  }
}

const GetUserFeedArticlesOutputSchema = object({
  result: object().shape({
    requestStatus: string().oneOf(['parse_error', 'pending', 'success']).required(),
    articles: array(object()).required(),
  }).required(),
}).required();

export type GetUserFeedArticlesOutput = InferType<typeof GetUserFeedArticlesOutputSchema>;

export const getUserFeedArticles = async (
  options: GetUserFeedArticlesInput,
): Promise<GetUserFeedArticlesOutput> => {
  const params = qs.stringify(options.data);

  const res = await fetchRest(
    `/api/v1/user-feeds/${options.feedId}/articles?${params}`,
    {
      validateSchema: GetUserFeedArticlesOutputSchema,
    },
  );

  return res as GetUserFeedArticlesOutput;
};