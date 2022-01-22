import { Joke } from '@prisma/client';
import {
  ActionFunction,
  Form,
  Link,
  LoaderFunction,
  MetaFunction,
  redirect,
  useCatch,
  useLoaderData,
  useParams,
} from 'remix';
import { JokeDisplay } from '~/components/joke';
import { db } from '~/utils/db.server';
import { requireUserId, getUserId } from '~/utils/session.server';

type LoaderData = {
  joke: Joke;
  isOwner: boolean;
};

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: 'No joke',
      description: 'No joke found',
    };
  }
  return {
    title: `"${data.joke.name}" joke`,
    description: `Enjoy the "${data.joke.name}" joke and much more`,
  };
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({ where: { id: params.jokeId } });
  if (!joke) {
    throw new Response('What a joke! Not found.', {
      status: 404,
    });
  }
  const data: LoaderData = { joke, isOwner: userId === joke.jokesterId };
  return data;
};

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();

  if (form.get('_method') === 'delete') {
    const userId = await requireUserId(request);
    const joke = await db.joke.findUnique({ where: { id: params.jokeId } });
    if (!joke) {
      throw new Response("Can't delete what does not exist", { status: 404 });
    }

    if (joke.jokesterId !== userId) {
      throw new Response('You can only delete your own jokes', { status: 401 });
    }

    await db.joke.delete({ where: { id: params.jokeId } });
    return redirect('/jokes');
  }
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return <JokeDisplay joke={data.joke} isOwner={data.isOwner} />;
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  switch (caught.status) {
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is {params.jokeId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.jokeId} is not your joke.
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
