"""
Exemplo de integração do Recipe Search Engine com ChefIA.

Este arquivo demonstra como integrar o recipe_search.py
em uma aplicação FastAPI típica do ChefIA.
"""

import os
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv

from recipe_search import (
    RecipeSearchEngine,
    UserGastronomicProfile,
    DietaryPreference,
    CuisineType,
    DifficultyLevel,
)

# Carregar variáveis de ambiente
load_dotenv()

# Inicializar FastAPI
app = FastAPI(title="ChefIA - Recipe Search Engine")

# Inicializar Recipe Search Engine (singleton)
recipe_engine = RecipeSearchEngine()


# ============================================
# Modelos Pydantic
# ============================================

class RecipeSearchRequest(BaseModel):
    """Requisição de busca de receita."""
    user_id: str
    query: str
    limit: int = 5
    personalized: bool = True


class RecipeResult(BaseModel):
    """Resultado de uma receita."""
    id: str
    title: str
    description: str
    cuisine_type: str
    difficulty_level: str
    cooking_time: int
    servings: int
    similarity: float
    personalization_score: Optional[float] = None


class UserProfileRequest(BaseModel):
    """Requisição para criar/atualizar perfil do usuário."""
    user_id: str
    dietary_preferences: List[str] = []
    favorite_cuisines: List[str] = []
    allergies: List[str] = []
    disliked_ingredients: List[str] = []
    preferred_difficulty: str = "medium"
    cooking_time_preference: int = 60
    spice_level: int = 5


class RecipeRatingRequest(BaseModel):
    """Requisição para avaliar uma receita."""
    user_id: str
    recipe_id: str
    rating: int
    comment: Optional[str] = None


# ============================================
# Funções auxiliares
# ============================================

def get_recipe_engine() -> RecipeSearchEngine:
    """Dependency injection para Recipe Search Engine."""
    return recipe_engine


def convert_profile_request_to_domain(
    request: UserProfileRequest,
) -> UserGastronomicProfile:
    """Converte requisição Pydantic para objeto de domínio."""
    return UserGastronomicProfile(
        user_id=request.user_id,
        dietary_preferences=[
            DietaryPreference(p) for p in request.dietary_preferences
        ],
        favorite_cuisines=[
            CuisineType(c) for c in request.favorite_cuisines
        ],
        allergies=request.allergies,
        disliked_ingredients=request.disliked_ingredients,
        preferred_difficulty=DifficultyLevel(request.preferred_difficulty),
        cooking_time_preference=request.cooking_time_preference,
        spice_level=request.spice_level,
    )


# ============================================
# Endpoints
# ============================================

@app.post("/search", response_model=List[RecipeResult])
async def search_recipes(
    request: RecipeSearchRequest,
    engine: RecipeSearchEngine = Depends(get_recipe_engine),
) -> List[RecipeResult]:
    """
    Buscar receitas com ou sem personalização.
    
    Se personalized=true, considera o perfil do usuário.
    Se personalized=false, faz busca semântica simples.
    """
    try:
        if request.personalized:
            # Recuperar perfil do usuário
            profile = engine.get_user_profile(request.user_id)
            
            if profile:
                results = engine.personalize_recommendations(
                    query=request.query,
                    user_profile=profile,
                    limit=request.limit,
                )
            else:
                # Se não houver perfil, fazer busca simples
                results = engine.search_recipes(
                    query=request.query,
                    limit=request.limit,
                )
        else:
            # Busca semântica simples
            results = engine.search_recipes(
                query=request.query,
                limit=request.limit,
            )

        # Converter para modelo Pydantic
        return [
            RecipeResult(
                id=r.get("id", ""),
                title=r.get("title", ""),
                description=r.get("description", ""),
                cuisine_type=r.get("cuisine_type", ""),
                difficulty_level=r.get("difficulty_level", ""),
                cooking_time=r.get("cooking_time", 0),
                servings=r.get("servings", 0),
                similarity=r.get("similarity", 0),
                personalization_score=r.get("personalization_score"),
            )
            for r in results
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na busca: {str(e)}")


@app.post("/profile")
async def create_or_update_profile(
    request: UserProfileRequest,
    engine: RecipeSearchEngine = Depends(get_recipe_engine),
):
    """
    Criar ou atualizar perfil gastronômico do usuário.
    """
    try:
        profile = convert_profile_request_to_domain(request)
        user_id = engine.save_user_profile(profile)

        return {
            "user_id": user_id,
            "status": "profile_saved",
            "profile": profile.to_dict(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar perfil: {str(e)}")


@app.get("/profile/{user_id}")
async def get_user_profile(
    user_id: str,
    engine: RecipeSearchEngine = Depends(get_recipe_engine),
):
    """
    Obter perfil gastronômico do usuário.
    """
    try:
        profile = engine.get_user_profile(user_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")

        return profile.to_dict()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter perfil: {str(e)}")


@app.post("/rate")
async def rate_recipe(
    request: RecipeRatingRequest,
    engine: RecipeSearchEngine = Depends(get_recipe_engine),
):
    """
    Registrar avaliação de uma receita.
    """
    try:
        rating_id = engine.rate_recipe(
            user_id=request.user_id,
            recipe_id=request.recipe_id,
            rating=request.rating,
            comment=request.comment,
        )

        return {
            "rating_id": rating_id,
            "status": "rating_saved",
            "recipe_id": request.recipe_id,
            "rating": request.rating,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar avaliação: {str(e)}")


@app.get("/trending")
async def get_trending_recipes(
    limit: int = 10,
    cuisine: Optional[str] = None,
    engine: RecipeSearchEngine = Depends(get_recipe_engine),
):
    """
    Obter receitas em tendência.
    """
    try:
        cuisine_filter = None
        if cuisine:
            cuisine_filter = CuisineType(cuisine)

        trending = engine.get_trending_recipes(
            limit=limit,
            cuisine_filter=cuisine_filter,
        )

        return {
            "trending_recipes": trending,
            "count": len(trending),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Culinária inválida: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter trending: {str(e)}")


@app.post("/favorites")
async def add_favorite(
    user_id: str,
    recipe_id: str,
    engine: RecipeSearchEngine = Depends(get_recipe_engine),
):
    """
    Adicionar receita aos favoritos.
    """
    try:
        engine.supabase.table("recipe_favorites").insert({
            "user_id": user_id,
            "recipe_id": recipe_id,
        }).execute()

        return {
            "status": "favorite_added",
            "user_id": user_id,
            "recipe_id": recipe_id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar favorito: {str(e)}")


@app.get("/recommendations/{user_id}")
async def get_recommendations(
    user_id: str,
    limit: int = 5,
    engine: RecipeSearchEngine = Depends(get_recipe_engine),
):
    """
    Obter recomendações baseadas em favoritos do usuário.
    """
    try:
        recommendations = engine.supabase.rpc(
            "get_recommendations_from_favorites",
            {
                "user_id_param": user_id,
                "max_results": limit,
            },
        ).execute()

        return {
            "recommendations": recommendations.data if recommendations.data else [],
            "count": len(recommendations.data) if recommendations.data else 0,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter recomendações: {str(e)}")


@app.get("/health")
async def health_check(engine: RecipeSearchEngine = Depends(get_recipe_engine)):
    """
    Verificar saúde da aplicação e conexão com Supabase.
    """
    try:
        # Tentar fazer uma query simples
        response = engine.supabase.table("recipes").select(
            "count", count="exact"
        ).limit(1).execute()

        return {
            "status": "healthy",
            "recipe_engine": "connected",
            "total_recipes": response.count if hasattr(response, "count") else 0,
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "recipe_engine": "disconnected",
            "error": str(e),
        }


# ============================================
# Middleware para logging
# ============================================

from fastapi.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware para logar requisições."""

    async def dispatch(self, request: Request, call_next):
        logger.info(f"Requisição: {request.method} {request.url.path}")
        response = await call_next(request)
        logger.info(f"Resposta: {response.status_code}")
        return response


# Adicionar middleware
app.add_middleware(LoggingMiddleware)


# ============================================
# Startup/Shutdown
# ============================================

@app.on_event("startup")
async def startup_event():
    """Executado ao iniciar a aplicação."""
    logger.info("Aplicação iniciada com Recipe Search Engine")
    
    # Verificar conexão com Supabase
    try:
        recipe_engine.supabase.table("recipes").select(
            "count", count="exact"
        ).limit(1).execute()
        logger.info("Conexão com Supabase estabelecida")
    except Exception as e:
        logger.error(f"Erro ao conectar com Supabase: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Executado ao desligar a aplicação."""
    logger.info("Aplicação desligada")


# ============================================
# Exemplo de uso
# ============================================

if __name__ == "__main__":
    import uvicorn

    # Executar com: python example_integration.py
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
    )
