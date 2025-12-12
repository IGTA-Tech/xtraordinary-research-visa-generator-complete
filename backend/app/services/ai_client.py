"""
AI Client with Claude primary + OpenAI fallback
"""
import anthropic
import openai
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize clients
claude_client = anthropic.AsyncAnthropic(
    api_key=settings.ANTHROPIC_API_KEY,
    timeout=300.0,  # 5 minute timeout
)

openai_client = None
if settings.OPENAI_API_KEY:
    openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_text(
    prompt: str,
    system_prompt: str = "",
    max_tokens: int = 16384,
    temperature: float = 0.3,
) -> str:
    """
    Generate text using Claude with OpenAI fallback.

    Args:
        prompt: The user prompt/content
        system_prompt: Optional system instructions
        max_tokens: Maximum tokens to generate
        temperature: Randomness (0.0 - 1.0)

    Returns:
        Generated text content
    """
    claude_error = None

    # Try Claude first
    try:
        logger.info("Calling Claude Sonnet 4.5...")
        response = await claude_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt if system_prompt else anthropic.NOT_GIVEN,
            messages=[{"role": "user", "content": prompt}]
        )

        if response.content and response.content[0].type == "text":
            logger.info(f"Claude succeeded, generated {len(response.content[0].text)} chars")
            return response.content[0].text

        raise Exception("Claude returned non-text response")

    except Exception as e:
        claude_error = e
        logger.warning(f"Claude failed: {e}")

    # Fallback to OpenAI if available
    if not openai_client:
        logger.error("OpenAI not configured, cannot fallback")
        raise claude_error

    try:
        logger.info("Falling back to OpenAI GPT-4o...")
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=min(max_tokens, 16384),  # GPT-4o limit
            temperature=temperature,
        )

        content = response.choices[0].message.content
        logger.info(f"OpenAI succeeded, generated {len(content)} chars")
        return content

    except Exception as openai_error:
        logger.error(f"OpenAI also failed: {openai_error}")
        raise Exception(f"Both AI providers failed. Claude: {claude_error}, OpenAI: {openai_error}")


async def generate_text_streaming(
    prompt: str,
    system_prompt: str = "",
    max_tokens: int = 16384,
    temperature: float = 0.3,
):
    """
    Generate text with streaming (yields chunks).
    Useful for real-time progress updates.
    """
    try:
        async with claude_client.messages.stream(
            model="claude-sonnet-4-5-20250929",
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt if system_prompt else anthropic.NOT_GIVEN,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            async for text in stream.text_stream:
                yield text

    except Exception as e:
        logger.error(f"Streaming failed: {e}")
        # Fall back to non-streaming
        result = await generate_text(prompt, system_prompt, max_tokens, temperature)
        yield result
